/**
 * Model: ApiKey (api_key table)
 * --------------------------------------------
 * Stores API credentials for authenticating requests to the system or to external sources.
 */

/**
 * ApiKey
 *
 * Represents a credential for controlling API access by key.
 */
export interface ApiKey {
  /**
   * Unique, auto-incremented primary key (Database: api_key.id)
   */
  id: number;

  /**
   * Optional descriptor (for dashboard, UI, etc) (Database: api_key.descriptor)
   */
  descriptor?: string | null;

  /**
   * The actual API key/token (Database: api_key.key)
   */
  key: string;
}
