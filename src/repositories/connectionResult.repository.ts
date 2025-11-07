/**
 * ConnectionResultRepository - Data access for ConnectionResult entity
 * --------------------------------------------------------------------
 * Specializes BaseRepository for connection_result table.
 */
import { BaseRepository } from '../db/baseRepository';
import type { DBConnection } from '../db/connection';
import type { ConnectionResult } from '../models/connectionResult';

export class ConnectionResultRepository extends BaseRepository<ConnectionResult> {
  constructor(connection: DBConnection) {
    super('connection_result', connection);
  }
}
