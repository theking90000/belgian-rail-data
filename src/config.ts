import { setupDB } from "./data";

export const config = new Bun.SQL("sqlite://config.db");

await setupDB(config, "config.db", [
  "CREATE TABLE tracked_vehicle (id VARCHAR(30) PRIMARY KEY);",
  "CREATE TABLE api_keys (id INTEGER PRIMARY KEY AUTOINCREMENT, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, key VARCHAR(50) UNIQUE);",
]);

export async function importConfigFiles() {
  if (!(await Bun.file("tracked.json").exists())) {
  }
  console.log(" * syncing config from tracked.json");
  try {
    const data: { vehicles?: string[]; api_keys?: string[] } = await Bun.file(
      "tracked.json"
    ).json();
    await config.transaction(async (tx) => {
      for (const id of data?.vehicles || []) {
        await tx`INSERT OR IGNORE INTO tracked_vehicle (id) VALUES (${id})`;
      }
      for (const api_key of data?.api_keys || []) {
        await tx`INSERT OR IGNORE INTO api_keys (key) VALUES (${api_key})`;
      }
    });
  } catch (err) {
    console.error(err);
  }
}

export async function getTrackedVehicles(): Promise<string[]> {
  return await config`SELECT id FROM tracked_vehicle`
    .values()
    .then((r) => r.flat());
}
