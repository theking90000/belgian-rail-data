/**
 * StationRepository - Data access for Station entity
 * --------------------------------------------------
 * Extends base repository with Station typing and custom lookup helpers.
 * All station persistence logic is centralized here.
 */
import { BaseRepository } from '../db/baseRepository';
import type { DBConnection } from '../db/connection';
import type { Station } from '../models/station';

export class StationRepository extends BaseRepository<Station> {
  constructor(connection: DBConnection) {
    super('station', connection);
  }

  /**
   * Find a station by its unique code (mnemonic).
   */
  async findByCode(code: string): Promise<Station | null> {
    const row = await this.connection.get('SELECT * FROM station WHERE code = ?', [code]);
    return row ? row as Station : null;
  }
}
