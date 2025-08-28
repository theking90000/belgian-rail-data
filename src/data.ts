import { sql, SQL } from "bun";

export const database = new SQL("sqlite://data.db");

export async function createDB(name: string, stmt: string[]): Promise<SQL> {
  const db = new SQL(`sqlite://${name}`);
  await setupDB(db, name, stmt);
  return db;
}

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
  "CREATE TABLE vehicle_stops (vehicle_id VARCHAR(30), date INT, stop_index INT, station_name TEXT, platform VARCHAR(10), scheduled_arrival_time INT, scheduled_departure_time INT, delay INT, departure_delay INT, departure_canceled BOOLEAN, arrival_delay INT, arrival_canceled BOOLEAN, occupancy VARCHAR(20), PRIMARY KEY (vehicle_id, date, stop_index));",
  "CREATE TABLE vehicle_composition (vehicle_id VARCHAR(30), date INT, material VARCHAR(30), units INT, m_detailed TEXT, PRIMARY KEY (vehicle_id, date))",
]);

function getProperty<T extends any = any>(obj: T, prop: string | string[]) {
  if (!Array.isArray(prop)) prop = prop.split(".");

  if (prop.length === 0) return obj;
  if (obj === undefined || obj === null) return obj;

  return getProperty(obj[prop[0] as keyof T], prop.slice(1));
}

function setProperty(obj: any, prop: string | string[], value: any) {
  if (!Array.isArray(prop)) prop = prop.split(".");

  if (prop.length === 0) return value;
  if (prop.length > 1 && !(prop[0]! in obj)) {
    obj[prop[0]!] = {};
  }
  if (prop.length === 1) {
    obj[prop[0]!] = value;
  }

  return setProperty(obj[prop[0]!], prop.slice(1), value);
}

export async function insertOrUpdate<T>(
  table: string,
  fields: Record<string, string>,
  primaryKey: string[] | string,
  data: T,
  db: SQL = database
) {
  if (!Array.isArray(primaryKey)) primaryKey = [primaryKey];

  const keys = Object.keys(fields);

  const values = keys.map((_, i) => `$${i + 1}`).join(", ");
  const valuesBind = [];

  for (const key of keys) {
    valuesBind.push(getProperty(data, fields[key] as string));
  }

  const excluded = keys
    .filter((k) => !primaryKey.includes(k))
    .map((k) => `${k} = excluded.${k}`)
    .join(", ");

  await db
    .unsafe(
      `INSERT INTO ${table} (${keys.join(", ")}) VALUES (${values}) ` +
        `ON CONFLICT(${primaryKey.join(", ")}) DO UPDATE SET ${excluded}`,
      valuesBind
    )
    .execute();
}

export async function get<T>(
  table: string,
  fields: Record<string, string>,
  where: string = "1=1",
  whereArgs: any[] = [],
  db: SQL = database
) {
  const keys = Object.keys(fields);

  const rows = await db
    .unsafe(`SELECT ${keys.join(", ")} FROM ${table} WHERE ${where}`, whereArgs)
    .values();

  return await rows.map((row: any[]) => {
    const obj = {};
    for (let i = 0; i < keys.length; i++) {
      setProperty(obj, fields[keys[i] as keyof typeof fields]!, row[i]);
    }
    return obj;
  });
}

type StationTime = {
  station: string;
  /** Stored as hours*100+minute */ at: number;
};
type VehicleInfo = { start: StationTime; end: StationTime; stopCount: number };

const VehicleInfoMapper = {
  id: "id",
  vehicle_start: "start.at",
  vehicle_end: "end.at",
  station_start: "start.station",
  station_end: "end.station",
  stop_count: "stopCount",
};

export async function setVehicleInfo(
  id: string,
  info: VehicleInfo
): Promise<void> {
  await insertOrUpdate("vehicle", VehicleInfoMapper, ["id"], {
    id,
    ...info,
  });
}

export async function getVehicleInfo(id: string): Promise<VehicleInfo | null> {
  const vehicle = await get("vehicle", VehicleInfoMapper, "id = $1", [id]);
  if (vehicle.length === 0) return null;

  return vehicle[0];
}

type VehicleStop = {
  vehicleId: string;
  date: number;
  stopIndex: number;
  stationName: string;
  platform: string;
  scheduledArrivalTime: number;
  scheduledDepartureTime: number;
  delay: number;
  departureDelay: number;
  departureCanceled: boolean;
  arrivalDelay: number;
  arrivalCanceled: boolean;
  occupancy: string;
};

const VehicleStopMapper = {
  vehicle_id: "vehicleId",
  date: "date",
  stop_index: "stopIndex",
  station_name: "stationName",
  platform: "platform",
  scheduled_arrival_time: "scheduledArrivalTime",
  scheduled_departure_time: "scheduledDepartureTime",
  delay: "delay",
  departure_delay: "departureDelay",
  departure_canceled: "departureCanceled",
  arrival_delay: "arrivalDelay",
  arrival_canceled: "arrivalCanceled",
  occupancy: "occupancy",
};

export async function getVehicleStop(
  vehicleId: string,
  date: number,
  stopIndex: number
): Promise<VehicleStop | null> {
  const stops = await get(
    "vehicle_stops",
    VehicleStopMapper,
    "vehicle_id = $1 AND date = $2 AND stop_index = $3",
    [vehicleId, date, stopIndex]
  );
  if (stops.length === 0) return null;
  return stops[0];
}

export async function getVehicleStops(
  vehicleId: string,
  date: number
): Promise<VehicleStop[] | null> {
  const stops = await get(
    "vehicle_stops",
    VehicleStopMapper,
    "vehicle_id = $1 AND date = $2 ORDER BY stop_index",
    [vehicleId, date]
  );
  if (stops.length === 0) return null;
  return stops;
}

export async function setVehicleStop(stop: VehicleStop): Promise<void> {
  await insertOrUpdate(
    "vehicle_stops",
    VehicleStopMapper,
    ["vehicle_id", "date", "stop_index"],
    stop
  );
}

export async function hasVehicleStop(
  vehicle: string,
  date: number
): Promise<boolean> {
  const stops =
    await database`SELECT 1 FROM vehicle_stops WHERE vehicle_id = ${vehicle} AND date = ${date} LIMIT 1;`;
  return stops.length > 0;
}

type VehicleComposition = {
  vehicleId: string;
  date: number;
  material: string;
  units: number;
  detailed: string;
};

const VehicleCompositionMapper = {
  vehicle_id: "vehicleId",
  date: "date",
  material: "material",
  units: "units",
  m_detailed: "detailed",
};

export async function getVehicleComposition(
  vehicleId: string,
  date: number
): Promise<VehicleComposition | null> {
  const result = await get(
    "vehicle_composition",
    VehicleCompositionMapper,
    "vehicle_id = $1 AND date = $2",
    [vehicleId, date]
  );
  if (result.length === 0) return null;
  return result[0];
}

export async function setVehicleComposition(
  composition: VehicleComposition
): Promise<void> {
  await insertOrUpdate(
    "vehicle_composition",
    VehicleCompositionMapper,
    ["vehicle_id", "date"],
    composition
  );
}
