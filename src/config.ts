import { setupDB } from "./data";

export const config = new Bun.SQL("sqlite://config.db");

await setupDB(config, "config.db", [
  "CREATE TABLE tracked_vehicle (id VARCHAR(30) PRIMARY KEY);",
  "CREATE TABLE api_keys (id INTEGER PRIMARY KEY AUTOINCREMENT, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, key VARCHAR(50) UNIQUE);",
  'CREATE TABLE tracked_connections ("from" TEXT, "to" TEXT, PRIMARY KEY ("from", "to"))',
  "ALTER TABLE tracked_connections ADD COLUMN fetch_vehicle_filter TEXT;",
  "ALTER TABLE tracked_connections ADD COLUMN fetch_time_range TEXT;",
  "ALTER TABLE tracked_connections ADD COLUMN do_fetch BOOLEAN;",
]);

export async function importConfigFiles() {
  if (!(await Bun.file("tracked.json").exists())) {
  }
  console.log(" * syncing config from tracked.json");
  try {
    const data: {
      vehicles?: string[];
      api_keys?: string[];
      connections?: [
        string,
        string,
        { fetch_vehicles: string[]; time_ranges: [string, string][] }?
      ][];
    } = await Bun.file("tracked.json").json();
    await config.transaction(async (tx) => {
      for (const id of data?.vehicles || []) {
        await tx`INSERT OR IGNORE INTO tracked_vehicle (id) VALUES (${id})`;
      }
      for (const api_key of data?.api_keys || []) {
        await tx`INSERT OR IGNORE INTO api_keys (key) VALUES (${api_key})`;
      }
      for (const conn of data?.connections || []) {
        if (conn.length == 2) {
          await tx`INSERT OR IGNORE INTO tracked_connections ("from", "to", do_fetch) VALUES (${conn[0]},${conn[1]}, false)`;
        } else if (conn.length === 3) {
          let fetchVehicleFilter = conn[2]!.fetch_vehicles.join(",");
          let timeRanges = conn[2]!.time_ranges
            .map((x) => x.join("-"))
            .join(",");

          await tx`INSERT OR IGNORE INTO tracked_connections ("from", "to", fetch_vehicle_filter, fetch_time_range, do_fetch) VALUES (${conn[0]}, ${conn[1]}, ${fetchVehicleFilter}, ${timeRanges}, true)`;
        }
      }
    });
  } catch (err) {
    // console.error(err);
  }
}

export async function getTrackedVehicles(): Promise<string[]> {
  return await config`SELECT id FROM tracked_vehicle`
    .values()
    .then((r) => r.flat());
}

export async function getApiKey(key: string): Promise<number | null> {
  return await config`SELECT id FROM api_keys WHERE key = ${key}`
    .values()
    .then((r) => (r.length > 0 ? r[0][0] : null));
}

export type TrackedConnection = [
  string,
  string,
  { fetchVehicleFilter: string[]; timeRanges: [string, string][] } | null
];

export async function getTrackedConnections(): Promise<TrackedConnection[]> {
  let data =
    (await config`SELECT "from", "to", do_fetch, fetch_vehicle_filter, fetch_time_range FROM tracked_connections`.values()) as [
      string,
      string,
      boolean,
      string?,
      string?
    ][];

  return data.map(
    ([from, to, doFetch, fetchVehicleFilter, timeRanges]) =>
      [
        from,
        to,
        doFetch
          ? {
              fetchVehicleFilter: fetchVehicleFilter?.split(",") || [],
              timeRanges: timeRanges
                ?.split(",")
                .map((d) => d.split("-") as [string, string]) || [
                ["0000", "2359"],
              ],
            }
          : null,
      ] as const
  );
}
