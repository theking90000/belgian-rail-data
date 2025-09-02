import { sql, SQL } from "bun";
import { Readable } from "stream";

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
  "CREATE TABLE vehicle_error (vehicle_id VARCHAR(30), date INT, fetch_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, PRIMARY KEY (vehicle_id, date));",
  'CREATE TABLE connections ("from" TEXT, "to" TEXT, date TEXT, vehicles TEXT, time TEXT, PRIMARY KEY("from", "to", date, vehicles))',
  'CREATE TABLE connections_fetch ("from" TEXT, "to" TEXT, date TEXT, PRIMARY KEY("from", "to", date))',
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
    .map((k) => '"' + k + '"')
    .map((k) => `${k} = excluded.${k}`)
    .join(", ");

  await db
    .unsafe(
      `INSERT INTO ${table} (${keys
        .map((k) => '"' + k + '"')
        .join(", ")}) VALUES (${values}) ` +
        (primaryKey.length > 0
          ? `ON CONFLICT(${primaryKey
              .map((k) => '"' + k + '"')
              .join(", ")}) DO UPDATE SET ${excluded}`
          : ""),
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
    .unsafe(
      `SELECT ${keys
        .map((k) => '"' + k + '"')
        .join(", ")} FROM ${table} WHERE ${where}`,
      whereArgs
    )
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

export function toJSDate(date: string): Date {
  if (date.length !== 6) throw new Error("Invalid ddmmyy date format");
  const day = parseInt(date.slice(0, 2), 10);
  const month = parseInt(date.slice(2, 4), 10) - 1;
  const year = 2000 + parseInt(date.slice(4, 6), 10);
  return new Date(year, month, day);
}

export function dateRange(afterDate: string, beforeDate: string) {
  // Generate all dates between afterDate and beforeDate (inclusive)
  const start = toJSDate(afterDate);
  const end = toJSDate(beforeDate);
  const dates: number[] = [];
  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    const y = d.getFullYear().toString().slice(2);
    const m = (d.getMonth() + 1).toString().padStart(2, "0");
    const dd = d.getDate().toString().padStart(2, "0");
    dates.push(Number(`${dd}${m}${y}`));
  }
  return dates;
}

function csvOrRow<T>(...params: Parameters<typeof get<T>>) {
  return {
    get(): ReturnType<typeof get<T>> {
      return get(...params);
    },
    csv(withMapping?: boolean): ReturnType<typeof toCSV<T>> {
      return toCSV(withMapping, ...params);
    },
  };
}

export function getVehicleStopsDated(
  vehicleId: string,
  afterDate: string,
  beforeDate: string
) {
  let dates = dateRange(afterDate, beforeDate);
  return csvOrRow<VehicleStop>(
    "vehicle_stops",
    VehicleStopMapper,
    `vehicle_id = $1 AND date IN (${dates
      .map((_, i) => `$${i + 2}`)
      .join(", ")}) ORDER BY date, stop_index`,
    [vehicleId, ...dates]
  );
}

export async function setVehicleStop(stop: VehicleStop): Promise<void> {
  await insertOrUpdate(
    "vehicle_stops",
    VehicleStopMapper,
    ["vehicle_id", "date", "stop_index"],
    stop
  );
}

export function getStationStops(
  station: string,
  date: string,
  before?: string
) {
  let dates = dateRange(date, before || date);
  return csvOrRow<VehicleStop[]>(
    "vehicle_stops",
    VehicleStopMapper,
    `station_name LIKE $1 ESCAPE '\\' AND date IN (${dates
      .map((_, i) => `$${i + 2}`)
      .join(", ")})`,
    [`%${station.replace(/([%_\\])/g, "\\$1")}%`, ...dates]
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

export function getVehicleComposition(
  vehicleId: string,
  date: string,
  before?: string
) {
  let dates = dateRange(date, before || date);
  return csvOrRow<VehicleComposition>(
    "vehicle_composition",
    VehicleCompositionMapper,
    `vehicle_id = $1 AND date IN (${dates
      .map((_, i) => `$${i + 2}`)
      .join(", ")})`,
    [vehicleId, ...dates]
  );
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

export async function hasVehicleError(vehicleId: string, date: number) {
  const result =
    await database`SELECT 1 FROM vehicle_error WHERE vehicle_id = ${vehicleId} AND date = ${date} LIMIT 1`;

  return result.length > 0;
}

export async function setVehicleError(vehicleId: string, date: number) {
  const result =
    await database`INSERT INTO  vehicle_error (vehicle_id, date) VALUES (${vehicleId}, ${date})`;

  return result.length > 0;
}

type Connection = {
  from: string;
  to: string;
  date: string;
  time: string;
  vehicles: string;
};

const ConnectionMapper = {
  from: "from",
  to: "to",
  date: "date",
  time: "time",
  vehicles: "vehicles",
};

export async function setConnection(connection: Connection): Promise<void> {
  await insertOrUpdate(
    "connections",
    ConnectionMapper,
    ["from", "to", "date", "vehicles"],
    connection
  );
}

export async function getLastConnection({
  from,
  to,
  date,
}: {
  from: string;
  to: string;
  date: string;
}): Promise<Connection | null> {
  return get(
    "connections",
    ConnectionMapper,
    '"from" = $1 AND "to" = $2 AND date = $3 ORDER BY time DESC LIMIT 1',
    [from, to, date]
  ).then((r) => (r.length === 0 ? null : r[0]));
}

type ConnectionFetch = {
  from: string;
  to: string;
  date: string;
};

const ConnectionFetchMapper = {
  from: "from",
  to: "to",
  date: "date",
};

export async function setConnectionFetch(
  fetch: ConnectionFetch
): Promise<void> {
  await insertOrUpdate("connections_fetch", ConnectionFetchMapper, [], fetch);
}

export async function getConnectionFetch(
  from: string,
  to: string,
  date: string
): Promise<ConnectionFetch | null> {
  const result = await get(
    "connections_fetch",
    ConnectionFetchMapper,
    '"from" = $1 AND "to" = $2 AND date = $3',
    [from, to, date]
  );
  return result.length === 0 ? null : result[0];
}

type ToCSV = Readable & { toResponse(): Response };

export function toCSV<T>(
  withMapping: boolean = true,
  table: string,
  fields: Record<string, string>,
  where: string = "1=1",
  whereArgs: any[] = [],
  db: SQL = database
): ToCSV {
  const keys = Object.keys(fields);

  async function* rowGenerator() {
    const rows = db.unsafe(
      `SELECT ${keys
        .map((k) => '"' + k + '"')
        .join(", ")} FROM ${table} WHERE ${where}`,
      whereArgs
    );

    yield (withMapping ? Object.values(fields) : keys).join(",") + "\n";

    for (const row of await rows) {
      // Helper to encode a value for CSV (handles quotes, commas, newlines)
      function encodeCSVValue(value: any): string {
        if (value == null) return "";
        const str = String(value);
        if (/[",\n\r]/.test(str)) {
          return `"${str.replace(/"/g, '""')}"`;
        }
        return str;
      }
      yield keys.map((k) => encodeCSVValue(row[k])).join(",") + "\n";
    }
  }

  const readable = Readable.from(rowGenerator());

  (readable as ToCSV).toResponse = function () {
    return new Response(readable, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
      },
    });
  };

  return readable as ToCSV;
}
