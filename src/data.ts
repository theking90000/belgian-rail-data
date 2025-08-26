import { sql, SQL } from "bun";

export const database = new SQL("sqlite://data.db");

export async function setupDB(db: SQL, name: string, stmt: string[]) {
  const migrated = await db.begin(async (tx) => {
    await tx`CREATE TABLE IF NOT EXISTS _setup_version (v INT)`;

    let v = await tx`SELECT v FROM _setup_version LIMIT 1;`.values();
    if (v.length === 0) {
      await tx`INSERT INTO _setup_version (v) VALUES (${0})`.values();
    }

    v = v.length === 0 ? 0 : v[0];

    if (v >= stmt.length) {
      return false;
    }

    console.log(
      ` * migrating ${name} from version ${v} to version ${stmt.length}`
    );

    for (; v < stmt.length; v++) {
      console.log(` * ${name}: applying version ${v + 1}`);
      await tx`${sql.unsafe(stmt[v] as string)}`;
    }

    await tx`UPDATE _setup_version SET v = ${v}`;

    return true;
  });

  if (migrated) console.log(` * migration of ${name} successful`);
}

setupDB(database, "data.sql", [
  "CREATE TABLE vehicle (id VARCHAR(30) PRIMARY KEY, vehicle_start INT, vehicle_end INT, station_start TEXT, station_end TEXT, stop_count INT);",
]);

type StationTime = {
  station: string;
  /** Stored as hours*100+minute */ at: number;
};
type VehicleInfo = { start: StationTime; end: StationTime; stopCount: number };

export async function getVehicleInfo(id: string): Promise<VehicleInfo | null> {
  const data =
    await database`SELECT vehicle_start, station_start, vehicle_end, station_end, stop_count FROM vehicle WHERE id = ${id}`.values();

  if (data.length === 0) return null;

  return {
    start: { station: data[0][1], at: data[0][0] },
    end: { station: data[0][3], at: data[0][2] },
    stopCount: data[0][4],
  };
}

export async function setVehicleInfo(
  id: string,
  info: VehicleInfo
): Promise<void> {
  await database`
    INSERT INTO vehicle (id, vehicle_start, station_start, vehicle_end, station_end, stop_count)
    VALUES (${id}, ${info.start.at}, ${info.start.station}, ${info.end.at}, ${info.end.station}, ${info.stopCount})
    ON CONFLICT(id) DO UPDATE SET
      vehicle_start = excluded.vehicle_start,
      station_start = excluded.station_start,
      vehicle_end = excluded.vehicle_end,
      station_end = excluded.station_end,
      stop_count = excluded.stop_count
  `;
}
