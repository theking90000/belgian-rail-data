/**
 * ConnectionQueryRepository - Data access for ConnectionQuery entity
 * ------------------------------------------------------------------
 * Specializes BaseRepository for connection_query table.
 */
import { BaseRepository } from '../db/baseRepository';
import type { DBConnection } from '../db/connection';
import type { ConnectionQuery } from '../models/connectionQuery';

export class ConnectionQueryRepository extends BaseRepository<ConnectionQuery> {
  constructor(connection: DBConnection) {
    super('connection_query', connection);
  }
}
