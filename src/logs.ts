import { createDB, insertOrUpdate, get } from "./data";

export const logsDB = await createDB("logs.db", [
  "CREATE TABLE fetch_log (id INTEGER PRIMARY KEY AUTOINCREMENT, at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, endpoint TEXT, status_code INT, duration FLOAT)",
  "ALTER TABLE fetch_log RENAME TO irail_log",
  "CREATE TABLE api_log (id TEXT PRIMARY KEY, at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, endpoint TEXT, status_code INT, duration FLOAT, key_id INT)",
  "CREATE TABLE api_error_log (request_id TEXT PRIMARY KEY, at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, endpoint TEXT, error_message TEXT)",
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
  await insertOrUpdate("irail_log", FetchLogMapper, ["id"], info, logsDB);
}

export async function getIrailLogs(
  offset: number,
  limit: number = 20
): Promise<IrailLog[]> {
  const logs = await get(
    "irail_log",
    FetchLogMapper,
    "ORDER BY when DESC OFFSET $1 LIMIT $2",
    [offset, limit]
  );

  return logs;
}

export type ApiLog = {
  endpoint: string;
  statusCode: number;
  duration: number;
  key: number;
  id: string;
};

const ApiLogMapper = {
  endpoint: "endpoint",
  status_code: "statusCode",
  duration: "duration",
  key_id: "key",
  id: "id",
};

export async function addApiLog(info: ApiLog): Promise<void> {
  await insertOrUpdate("api_log", ApiLogMapper, ["id"], info, logsDB);
}

export async function getApiLogs(
  offset: number,
  limit: number = 20
): Promise<ApiLog[]> {
  const logs = await get(
    "api_log",
    ApiLogMapper,
    "ORDER BY at DESC OFFSET $1 LIMIT $2",
    [offset, limit]
  );

  return logs;
}

export type ApiErrorLog = {
  endpoint: string;
  errorMessage: string;
  requestId: string;
};

const ApiErrorLogMapper = {
  endpoint: "endpoint",
  error_message: "errorMessage",
  request_id: "requestId",
};

export async function addApiErrorLog(info: ApiErrorLog): Promise<void> {
  await insertOrUpdate(
    "api_error_log",
    ApiErrorLogMapper,
    ["request_id"],
    info,
    logsDB
  );
}

export async function getApiErrorLogs(
  offset: number,
  limit: number = 20
): Promise<ApiErrorLog[]> {
  const logs = await get(
    "api_error_log",
    ApiErrorLogMapper,
    "ORDER BY at DESC OFFSET $1 LIMIT $2",
    [offset, limit]
  );

  return logs;
}
