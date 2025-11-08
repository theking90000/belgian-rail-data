/**
 * deps.ts
 * ----------------------
 * Bootstrap and dependency wiring.
 */

import {
  type DbConfig,
  type DBConnection,
  createDbConnection,
} from "./db/connection";
import { MigrationsManager } from "./db/migrationsManager";
import { LoggedIRailAPIClient } from "./irail/logged-irail-client";
import migrations from "./migrations";
import { ApiKeyRepository } from "./repositories/apiKey.repository";
import { KeyPermissionRepository } from "./repositories/keyPermission.repository";
import { LogEntryRepository } from "./repositories/logEntry.repository";
import { MaterialTypeRepository } from "./repositories/materialType.repository";
import { MaterialUnitRepository } from "./repositories/materialUnit.repository";
import { PermissionRepository } from "./repositories/permission.repository";
import { StationRepository } from "./repositories/station.repository";
import { TrackedTrainRepository } from "./repositories/trackedTrain.repository";
import { TrainCompositionSegmentRepository } from "./repositories/trainCompositionSegment.repository";
import { TrainCompositionUnitRepository } from "./repositories/trainCompositionUnit.repository";
import { TrainRunRepository } from "./repositories/trainRun.repository";
import { TrainStopRepository } from "./repositories/trainStop.repository";
import {
  DefaultCacheService,
  FileCacheBackend,
  type CacheService,
} from "./services/cache-service";
import { DefaultCompositionService } from "./services/composition-service";
import { DefaultFetchEligibilityService } from "./services/fetch-eligibility-service";
import { CachedGTFSService, IRailGTFSService } from "./services/gtfs-service";
import { DefaultSchedulerService } from "./services/scheduler-service";
import { DefaultTrainRunService } from "./services/train-run-service";
import { DefaultWakeService } from "./services/wake-service";

export interface Config {
  database: DbConfig;
  cache: {
    ttlMs: number;
    dir: string;
  };
}

export interface Deps {
  db: DBConnection;
  cache: CacheService;
  migrationManager: MigrationsManager;
  logEntryRepo: LogEntryRepository;
  stationRepo: StationRepository;
  trainStopRepo: TrainStopRepository;
  trainRunRepo: TrainRunRepository;
  trackedTrainRepo: TrackedTrainRepository;
  trainCompositionUnitRepo: TrainCompositionUnitRepository;
  materialTypeRepo: MaterialTypeRepository;
  materialUnitRepo: MaterialUnitRepository;
  compositionSegmentRepo: TrainCompositionSegmentRepository;
  irail: LoggedIRailAPIClient;
  gtfsService: CachedGTFSService;
  fetchEligibility: DefaultFetchEligibilityService;
  trainRunService: DefaultTrainRunService;
  compositionService: DefaultCompositionService;
  wakeService: DefaultWakeService;
  schedulerService: DefaultSchedulerService;
  apiKeyRepository: ApiKeyRepository;
  keyPermissionRepo: KeyPermissionRepository;
  permissionRepo: PermissionRepository;
}

export async function bootstrapDependencies(config: Config): Promise<Deps> {
  const db = await createDbConnection(config.database);
  const cache = new DefaultCacheService(
    new FileCacheBackend(config.cache.ttlMs, config.cache.dir)
  );

  const migrationManager = new MigrationsManager(db, migrations);

  const logEntryRepo = new LogEntryRepository(db);
  const stationRepo = new StationRepository(db);
  const trainStopRepo = new TrainStopRepository(db);
  const trainRunRepo = new TrainRunRepository(db, stationRepo, trainStopRepo);
  const trackedTrainRepo = new TrackedTrainRepository(db);
  const trainCompositionUnitRepo = new TrainCompositionUnitRepository(db);
  const materialTypeRepo = new MaterialTypeRepository(db);
  const materialUnitRepo = new MaterialUnitRepository(db, materialTypeRepo);
  const apiKeyRepository = new ApiKeyRepository(db);
  const permissionRepo = new PermissionRepository(db);
  const keyPermissionRepo = new KeyPermissionRepository(db, permissionRepo);

  const compositionSegmentRepo = new TrainCompositionSegmentRepository(
    db,
    stationRepo,
    // @ts-ignore
    trainCompositionUnitRepo,
    materialUnitRepo
  );

  const irail = new LoggedIRailAPIClient(logEntryRepo);

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

  return {
    db,
    cache,
    migrationManager,
    logEntryRepo,
    stationRepo,
    trainStopRepo,
    trainRunRepo,
    trackedTrainRepo,
    trainCompositionUnitRepo,
    materialTypeRepo,
    materialUnitRepo,
    compositionSegmentRepo,
    irail,
    gtfsService,
    fetchEligibility,
    trainRunService,
    compositionService,
    wakeService,
    schedulerService,
    apiKeyRepository,
    keyPermissionRepo,
    permissionRepo,
  };
}
