/**
 * LoggedIRailAPIClient: IRail client with logging to LogEntryRepository
 */
import { IRailAPIClient, type IRailAPIClientOptions, type Query } from "./irail-client";
import type { LogEntry } from "@src/models/logEntry";
import { LogEntryRepository } from "@src/repositories/logEntry.repository";

export class LoggedIRailAPIClient extends IRailAPIClient {
    private logRepo: LogEntryRepository;

    /**
     * @param logRepo LogEntryRepository for log persistence
     * @param opts    IRailAPIClientOptions as for base client
     */
    constructor(logRepo: LogEntryRepository, opts?: IRailAPIClientOptions) {
      super(opts);
      this.logRepo = logRepo;
    }

    /**
     * Override API call to log each request/response/error using LogEntryRepository.
     * Logs: logType ("FETCH"), entityId (endpoint), status, optional error details
     */
    override async requestApi<T>(
      endpoint: string,
      init?: RequestInit & { query?: Query }
    ): Promise<T> {
      const startTime = new Date();
      let statusCode: number | null = null;
      let error: string | null = null;
      let resp: T | null = null;

      try {
        // Call the parent class for actual API
        const result = await super.requestApi<T>(endpoint, init);
        statusCode = 200; // If no error, assume 200
        resp = result;
        // Attempt best-effort statusCode from fetch() if supported
        // NOTE: see if parent returns more status data for improvement
        return result;
      } catch (err: any) {
        statusCode = typeof err?.status === "number" ? err.status : null;
        error = err?.message || String(err);
        throw err;
      } finally {
        const log: Omit<LogEntry, "id"> = {
          logTime: new Date().toISOString(),
          logType: "FETCH",
          entityId: endpoint,
          message: error
            ? `IRail API FAILED: ${endpoint} (${error})`
            : `IRail API OK: ${endpoint}`,
          statusCode: statusCode,
          details: {
            query: (init && init.query) || undefined,
            response: resp || undefined,
            error: error || undefined,
            at: startTime.toISOString(),
          },
        };
        // Insert, ignoring errors
        try {
          await this.logRepo.create(log);
        } catch (logErr) {
          // silent fail to prevent logging error from bubbling to user
        }
      }
    }
  }