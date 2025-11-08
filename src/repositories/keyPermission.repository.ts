/**
 * KeyPermissionRepository - Data access for KeyPermission entity
 * -------------------------------------------------------------
 * Specializes BaseRepository for key_permission table.
 */
import type { Permission } from "@src/models/permission";
import { BaseRepository } from "../db/baseRepository";
import type { DBConnection } from "../db/connection";
import type { KeyPermission } from "../models/keyPermission";
import type { PermissionRepository } from "./permission.repository";

export class KeyPermissionRepository extends BaseRepository<KeyPermission> {
  constructor(
    connection: DBConnection,
    private readonly permissionRepository: PermissionRepository
  ) {
    super("key_permission", connection);
  }

  async upserts(
    keyPermissions: Omit<KeyPermission, "id">[]
  ): Promise<KeyPermission[]> {
    return this._upserts(keyPermissions, ["apiKeyId", "permissionId"]);
  }

  async addPermissionsToKey(
    keyId: number,
    permissions: Omit<Permission, "id">[]
  ) {
    const p = await this.permissionRepository.upserts(permissions);

    await this.upserts(
      p.map((perm) => ({ apiKeyId: keyId, permissionId: perm.id }))
    );
  }
}
