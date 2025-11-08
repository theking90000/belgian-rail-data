/**
 * KeyPermission (key_permission table)
 * --------------------------------------------
 * Associates API keys with permissions.
 */
export interface KeyPermission {
  /**
   * Foreign key referencing api_key.id (Database: key_permission.api_key_id)
   */
  apiKeyId: number;

  /**
   * Foreign key referencing permission.id (Database: key_permission.permission_id)
   */
  permissionId: number;
}
