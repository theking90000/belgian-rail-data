/**
 * ApiKeyRepository - Data access for ApiKey entity
 * ------------------------------------------------
 * Specializes BaseRepository for api_key table.
 */
import { BaseRepository } from "../db/baseRepository";
import type { DBConnection } from "../db/connection";
import type { ApiKey } from "../models/apiKey";
import type { Permission } from "@src/models/permission";

export class ApiKeyRepository extends BaseRepository<ApiKey> {
  constructor(connection: DBConnection) {
    super("api_key", connection);
  }

  async getPermissionsForKey(
    key: string
  ): Promise<[ApiKey, Permission[]] | null> {
    const rows = await this.connection.query(
      `
        SELECT api_key.id AS a_id, api_key.descriptor AS a_descriptor, api_key.key AS a_key, permission.id AS p_id, permission.name AS p_name FROM api_key
        LEFT JOIN key_permission ON api_key.id = key_permission.api_key_id
        LEFT JOIN permission ON key_permission.permission_id = permission.id
        WHERE api_key.key = ?
      `,
      [key]
    );

    if (rows.length === 0) {
      return null;
    }

    const apiKey: ApiKey = this.mapFromDb(
      Object.fromEntries(
        Object.entries(rows[0])
          .filter(([k, v]) => k.startsWith("a_"))
          .map(([k, v]) => [k.slice(2), v])
      )
    );

    const permissions: Permission[] = rows.map((r) =>
      this.mapFromDb(
        Object.fromEntries(
          Object.entries(r)
            .filter(([k, v]) => k.startsWith("p_") && v !== null)
            .map(([k, v]) => [k.slice(2), v])
        )
      )
    );

    return [apiKey, permissions];
  }
}
