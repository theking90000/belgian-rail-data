/**
 * Model: Permission (permission table)
 * --------------------------------------------
 * Stores permissions that can be assigned to API keys.
 */

/**
 * Permission
 *
 * Represents a permission that can be granted to an API key.
 */
export interface Permission {
  /**
   * Unique, auto-incremented primary key (Database: permission.id)
   */
  id: number;

  /**
   * Unique name of the permission (Database: permission.name)
   */
  name: string;
}
