/**
 * Model: LogEntry (log_entry table)
 * ------------------------------------------------------
 * Represents a log entry (event, error, fetch, or business event)
 * with time, type, status, and optional details.
 */

/**
 * LogEntry
 *
 * Systems/diagnostics/business logging entity. Used for auditing, monitoring, and troubleshooting.
 */
export interface LogEntry {
  /**
   * Unique, auto-incremented primary key (Database: log_entry.id)
   */
  id: number;

  /**
   * Time this log was recorded (ISO8601, local) (Database: log_entry.log_time)
   */
  logTime: string;

  /**
   * Machine-readable type code (e.g., "ERROR", "FETCH", etc) (Database: log_entry.log_type)
   */
  logType: string;

  /**
   * Entity affected (train, station, etc); may be stringified id or object key (Database: log_entry.entity_id)
   */
  entityId?: string | null;

  /**
   * Main log message or event detail (Database: log_entry.message)
   */
  message: string;

  /**
   * Optional associated status or error code (Database: log_entry.status_code)
   */
  statusCode?: number | null;

  /**
   * Additional details/context as JSON (Database: log_entry.details)
   */
  details?: any;
}
