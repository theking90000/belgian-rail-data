/**
 * ApiKeyRepository - Data access for ApiKey entity
 * ------------------------------------------------
 * Specializes BaseRepository for api_key table.
 */
import { BaseRepository } from '../db/baseRepository';
import type { DBConnection } from '../db/connection';
import type { ApiKey } from '../models/apiKey';

export class ApiKeyRepository extends BaseRepository<ApiKey> {
  constructor(connection: DBConnection) {
    super('api_key', connection);
  }
}
