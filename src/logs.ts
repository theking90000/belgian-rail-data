import { createDB, insertOrUpdate, get } from "./data";

export const logsDB = await createDB("logs.db", [
  "CREATE TABLE fetch_log (id INTEGER PRIMARY KEY AUTOINCREMENT, at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, endpoint TEXT, status_code INT, duration FLOAT)",
  "ALTER TABLE fetch_log RENAME TO irail_log",
]);

export type IrailLog = {
  endpoint: string;
  statusCode: number;
  duration: number;
};

const FetchLogMapper = {
  endpoint: "endpoint",
  status_code: "statusCode",
  duration: "duration",
};

export async function addIrailLog(info: IrailLog): Promise<void> {
  await insertOrUpdate("fetch_log", FetchLogMapper, ["id"], info, logsDB);
}

export async function getIrailLogs(
  offset: number,
  limit: number = 20
): Promise<IrailLog[]> {
  const logs = await get(
    "fetch_log",
    FetchLogMapper,
    "ORDER BY when DESC OFFSET $1 LIMIT $2",
    [offset, limit]
  );

  return logs;
}
