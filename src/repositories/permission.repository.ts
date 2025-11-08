/**
 * PermissionRepository - Data access for Permission entity
 * --------------------------------------------------------
 * Specializes BaseRepository for permission table.
 */
import { BaseRepository } from "../db/baseRepository";
import type { DBConnection } from "../db/connection";
import type { Permission } from "../models/permission";

export class PermissionRepository extends BaseRepository<Permission> {
  constructor(connection: DBConnection) {
    super("permission", connection);
  }

  async upserts(permissions: Omit<Permission, "id">[]): Promise<Permission[]> {
    return this._upserts(permissions, ["name"]);
  }
}
