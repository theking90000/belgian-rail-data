/**
 * Main application entrypoint for CLI modes: --wake, --scheduler, --server.
 * - Sets up config, logging, DB, DI for all services/repositories.
 * - Parses flags and dispatches the selected mode.
 * - All logic is invoked through orchestration or API layer—never direct DB/repo/service calls!
 */

import { createDbConnection } from "./db/connection";
import { TrainRunRepository } from "./repositories/trainRun.repository";
import { TrackedTrainRepository } from "./repositories/trackedTrain.repository";
import { DefaultTrainRunService } from "./services/train-run-service";
import { IRailGTFSService, CachedGTFSService } from "./services/gtfs-service";
import {
  FileCacheBackend,
  DefaultCacheService,
} from "./services/cache-service";
import { DefaultFetchEligibilityService } from "./services/fetch-eligibility-service";
import { DefaultWakeService } from "./services/wake-service";
import { DefaultSchedulerService } from "./services/scheduler-service";
import { StationRepository } from "./repositories/station.repository";
import { TrainStopRepository } from "./repositories/trainStop.repository";
import { IRailAPIClient } from "./irail/irail-client";
import { TrainCompositionSegmentRepository } from "./repositories/trainCompositionSegment.repository";
import { MaterialTypeRepository } from "./repositories/materialType.repository";
import { TrainCompositionUnitRepository } from "./repositories/trainCompositionUnit.repository";
import { MaterialUnitRepository } from "./repositories/materialUnit.repository";
import { DefaultCompositionService } from "./services/composition-service";
import { MigrationsManager } from "./db/migrationsManager";
import migrations from "./migrations";

// Optionally: use a CLI library; below is minimal
function parseArgs() {
  const args = process.argv.slice(2);
  return {
    scheduler: args.includes("--scheduler"),
    wake: args.includes("--wake"),
    server: args.includes("--server"),
    // Add more flags as needed (db path, config, logging, etc)
  };
}

async function bootstrap() {
  // 1. Load config, set up DB connection, logging as appropriate
  // (Config loading omitted for brevity, add as needed)
  const db = await createDbConnection({ type: "sqlite", filePath: "brd.db" });
  const cache = new DefaultCacheService(
    new FileCacheBackend(24 * 60 * 60 * 1000, "./cache")
  );

  const migrationManager = new MigrationsManager(db, migrations);

  const irail = new IRailAPIClient();

  // 2. Instantiate repositories
  const stationRepo = new StationRepository(db);
  const trainStopRepo = new TrainStopRepository(db);
  const trainRunRepo = new TrainRunRepository(db, stationRepo, trainStopRepo);
  const trackedTrainRepo = new TrackedTrainRepository(db);
  const trainCompositionUnitRepo = new TrainCompositionUnitRepository(db);
  const materialTypeRepo = new MaterialTypeRepository(db);
  const materialUnitRepo = new MaterialUnitRepository(db, materialTypeRepo);

  const compositionSegmentRepo = new TrainCompositionSegmentRepository(
    db,
    stationRepo,
    // @ts-ignore
    trainCompositionUnitRepo,
    materialUnitRepo
  );

  // 3. Instantiate services (wire dependencies DI style)
  const gtfsService = new CachedGTFSService(new IRailGTFSService(), cache);
  const fetchEligibility = new DefaultFetchEligibilityService(
    gtfsService,
    trainRunRepo
  );
  const trainRunService = new DefaultTrainRunService(irail, trainRunRepo);

  const compositionService = new DefaultCompositionService(
    irail,
    compositionSegmentRepo
  );

  const wakeService = new DefaultWakeService(
    trackedTrainRepo,
    fetchEligibility,
    trainRunService,
    compositionService
  );

  const schedulerService = new DefaultSchedulerService(
    trackedTrainRepo,
    fetchEligibility,
    wakeService
  );

  await migrationManager.migrate();

  // 4. Parse CLI args and dispatch mode
  const flags = parseArgs();
  if (flags.wake) {
    console.log("[Wake] Starting batch job for tracked trains…");
    await wakeService.wake();
    process.exit(0);
  }
  if (flags.scheduler) {
    console.log("[Scheduler] Starting persistent scheduler… (Ctrl+C to stop)");
    await schedulerService.runScheduler();
    process.exit(0);
  }
  if (flags.server) {
    // TODO: In next phase, spin up REST API (see API task)
    console.log("[API] Server mode not yet implemented");
    process.exit(1);
  }
  console.log(
    "No valid mode flag specified. Use --wake, --scheduler, or --server."
  );
  process.exit(1);
}

bootstrap().catch((err) => {
  // Central error handler and logging
  console.error("Fatal error in bootstrap:", err);
  process.exit(1);
});
