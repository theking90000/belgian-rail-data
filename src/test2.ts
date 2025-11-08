import { createDbConnection } from "./db/connection";
import { MigrationsManager } from "./db/migrationsManager";
import { IRailAPIClient } from "./irail/irail-client";
import migrations from "./migrations";
import { MaterialTypeRepository } from "./repositories/materialType.repository";
import { MaterialUnitRepository } from "./repositories/materialUnit.repository";
import { StationRepository } from "./repositories/station.repository";
import { TrackedTrainRepository } from "./repositories/trackedTrain.repository";
import { TrainCompositionSegmentRepository } from "./repositories/trainCompositionSegment.repository";
import { TrainCompositionUnitRepository } from "./repositories/trainCompositionUnit.repository";
import { TrainRunRepository } from "./repositories/trainRun.repository";
import { TrainStopRepository } from "./repositories/trainStop.repository";
import { DefaultCompositionService } from "./services/composition-service";
import { DefaultFetchEligibilityService } from "./services/fetch-eligibility-service";
import { IRailGTFSService } from "./services/gtfs-service";
import { DefaultSchedulerService } from "./services/scheduler-service";
import { DefaultTrainRunService } from "./services/train-run-service";
import { DefaultWakeService } from "./services/wake-service";

const db = await createDbConnection({ type: "sqlite", filePath: "test.db" });

const migrationsManager = new MigrationsManager(db, migrations);

await migrationsManager.migrate();

const tr = new TrainRunRepository(
  db,
  new StationRepository(db),
  new TrainStopRepository(db)
);

const trainRunService = new DefaultTrainRunService(new IRailAPIClient(), tr);

const compositionService = new DefaultCompositionService(
  new IRailAPIClient(),
  new TrainCompositionSegmentRepository(
    db,
    new StationRepository(db),
    // @ts-ignore
    new TrainCompositionUnitRepository(db),
    new MaterialUnitRepository(db, new MaterialTypeRepository(db))
  )
);

const gtfs = new IRailGTFSService();

const fetchEligibilityService = new DefaultFetchEligibilityService(gtfs, tr);
const wakeService = new DefaultWakeService(
  new TrackedTrainRepository(db),
  fetchEligibilityService,
  trainRunService,
  compositionService
);

const schedulerService = new DefaultSchedulerService(
  new TrackedTrainRepository(db),
  fetchEligibilityService,
  wakeService
);

try {
  await schedulerService.runScheduler();
} catch (e) {
  console.error("Error during fetch and store:", e);
}
