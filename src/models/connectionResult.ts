/**
 * Model: ConnectionResult (connection_result table)
 * --------------------------------------------------------------
 * Stores a JSON blob captured as the result of a connection query,
 * with a timestamp and reference to the originating query.
 */

/**
 * ConnectionResult
 *
 * Result of a ConnectionQuery run. Holds results in freeform JSON (typically array of legs/routes, etc).
 */
export interface ConnectionResult {
  /**
   * Unique, auto-incremented primary key (Database: connection_result.id)
   */
  id: number;

  /**
   * Foreign key to ConnectionQuery (Database: connection_result.query_id)
   */
  queryId: number;

  /**
   * Timestamp for when this result was fetched (ISO8601) (Database: connection_result.searched_at)
   */
  searchedAt: string;

  /**
   * Result set as JSON blob (Database: connection_result.result_json)
   * Typical shape is array of connections/routes
   */
  resultJson: any;
}
