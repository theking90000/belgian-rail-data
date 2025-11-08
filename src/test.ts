import { createDbConnection } from "./db/connection";
import { MigrationsManager } from "./db/migrationsManager";
import { IRailAPIClient } from "./irail/irail-client";
import migrations from "./migrations";
import { MaterialTypeRepository } from "./repositories/materialType.repository";
import { MaterialUnitRepository } from "./repositories/materialUnit.repository";
import { StationRepository } from "./repositories/station.repository";
import { TrainCompositionSegmentRepository } from "./repositories/trainCompositionSegment.repository";
import { TrainCompositionUnitRepository } from "./repositories/trainCompositionUnit.repository";
import { TrainRunRepository } from "./repositories/trainRun.repository";
import { TrainStopRepository } from "./repositories/trainStop.repository";
import { DefaultCompositionService } from "./services/composition-service";
import { DefaultTrainRunService } from "./services/train-run-service";

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

try {
  const train = "IC13776";
  const date = new Date();

  const p = await trainRunService.fetchAndStoreRun(train, date);
  console.log("Fetch and store completed");
  console.log(p);

  const rID = await tr.getRun(train, date);
  console.log("Run ID:", rID?.id);

  const p2 = await compositionService.fetchAndStoreComposition(
    train,
    date,
    rID!.id
  );

  console.log("Fetch and store completed");
  console.log(p2);
} catch (e) {
  console.error("Error during fetch and store:", e);
}
