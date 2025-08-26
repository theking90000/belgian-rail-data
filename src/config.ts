import { setupDB } from "./data";

export const config = new Bun.SQL("sqlite://config.db");

await setupDB(config, "config.db", [
  "CREATE TABLE tracked_vehicle (id VARCHAR(30) PRIMARY KEY);",
]);

export async function importConfigFiles() {
  if (!(await Bun.file("tracked.json").exists())) {
  }
  console.log(" * syncing config from tracked.json");
  try {
    const data: { vehicles: string[] } = await Bun.file("tracked.json").json();
    await config.transaction(async (tx) => {
      for (const id of data.vehicles) {
        await tx`INSERT OR IGNORE INTO tracked_vehicle (id) VALUES (${id})`;
      }
    });
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code !== "ENOENT") {
      throw err;
    }
  }
}

export async function getTrackedVehicles(): Promise<string[]> {
  return await config`SELECT id FROM tracked_vehicle`
    .values()
    .then((r) => r.flat());
}
