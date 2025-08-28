import { createDB, insertOrUpdate, get } from "./data";

export const logsDB = await createDB("logs.db", [
  "CREATE TABLE fetch_log (id INTEGER PRIMARY KEY AUTOINCREMENT, at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, endpoint TEXT, status_code INT, duration FLOAT)",
]);

export type FetchLog = {
  endpoint: string;
  statusCode: number;
  duration: number;
};

const FetchLogMapper = {
  endpoint: "endpoint",
  status_code: "statusCode",
  duration: "duration",
};

export async function addFetchLog(info: FetchLog): Promise<void> {
  await insertOrUpdate("fetch_log", FetchLogMapper, ["id"], info, logsDB);
}

export async function getFetchLogs(
  offset: number,
  limit: number = 20
): Promise<FetchLog[]> {
  const logs = await get(
    "fetch_log",
    FetchLogMapper,
    "ORDER BY when DESC OFFSET $1 LIMIT $2",
    [offset, limit]
  );

  return logs;
}
