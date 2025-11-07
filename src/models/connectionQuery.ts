/**
 * Model: ConnectionQuery (connection_query table)
 * -------------------------------------------------------------------
 * Represents a saved or template route search between two stations,
 * optionally with filter JSON and an enabled flag for automation.
 */

/**
 * ConnectionQuery
 *
 * Stores query config for regularly searched routes. Includes endpoints, filters, and enabled status.
 */
export interface ConnectionQuery {
  /**
   * Unique, auto-incremented primary key (Database: connection_query.id)
   */
  id: number;

  /**
   * From station (foreign key to Station.id, Database: connection_query.from_station_id)
   */
  fromStationId: number;

  /**
   * To station (foreign key to Station.id, Database: connection_query.to_station_id)
   */
  toStationId: number;

  /**
   * Freeform JSON with route/option filters (Database: connection_query.filters)
   */
  filters?: any;

  /**
   * Boolean; indicates if this query is currently enabled (Database: connection_query.enabled)
   */
  enabled: boolean;
}
