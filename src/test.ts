import { createDbConnection } from "./db/connection";
import { MigrationsManager } from "./db/migrationsManager";
import { IRailAPIClient } from "./irail/irail-client";
import migrations from "./migrations";
import { StationRepository } from "./repositories/station.repository";
import { TrainRunRepository } from "./repositories/trainRun.repository";
import { TrainStopRepository } from "./repositories/trainStop.repository";
import { DefaultTrainRunService } from "./services/train-run-service";

const db = await createDbConnection({ type: "sqlite", filePath: "test.db" });

const migrationsManager = new MigrationsManager(db, migrations);

await migrationsManager.migrate();

const trainRunService = new DefaultTrainRunService(
  new IRailAPIClient(),
  new TrainRunRepository(
    db,
    new StationRepository(db),
    new TrainStopRepository(db)
  )
);
//console.log(new Date("2024-06-01"));
try {
  const p = await trainRunService.fetchAndStoreRun("IC1832", new Date());

  console.log("Fetch and store completed");
  console.log(p);
} catch (e) {
  console.error("Error during fetch and store:", e);
}
