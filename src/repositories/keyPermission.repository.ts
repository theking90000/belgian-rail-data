/**
 * KeyPermissionRepository - Data access for KeyPermission entity
 * -------------------------------------------------------------
 * Specializes BaseRepository for key_permission table.
 */
import { BaseRepository } from "../db/baseRepository";
import type { DBConnection } from "../db/connection";
import type { KeyPermission } from "../models/keyPermission";

export class KeyPermissionRepository extends BaseRepository<KeyPermission> {
  constructor(connection: DBConnection) {
    super("key_permission", connection);
  }
}
