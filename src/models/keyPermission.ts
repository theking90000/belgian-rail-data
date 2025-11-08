/**
 * KeyPermission (key_permission table)
 * --------------------------------------------
 * Associates API keys with permissions.
 */
export interface KeyPermission {
  /**
   * Foreign key referencing api_key.id (Database: key_permission.api_key_id)
   */
  api_key_id: number;

  /**
   * Foreign key referencing permission.id (Database: key_permission.permission_id)
   */
  permission_id: number;
}
