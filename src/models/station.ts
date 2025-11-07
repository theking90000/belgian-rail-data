/**
 * Model: Station (station table)
 * ----------------------------------------------
 * Represents a Belgian railway station. This entity contains
 * the official name, a unique mnemonic code, and geolocation coordinates.
 * Used as the endpoint and intermediate nodes for train runs and stops.
 */

/**
 * Station
 *
 * An individual railway station, uniquely identified and used for scheduling, routes,
 * and system queries throughout the tracker. Codes are standard NMBS/SNCB codes.
 */
export interface Station {
  /**
   * Unique, auto-incremented primary key
   * (Database: station.id)
   */
  id: number;

  /**
   * Full station name, as displayed in user-facing applications
   * (Database: station.name)
   */
  name: string;

  /**
   * Unique short code (mnemonic for station)
   * E.g., "BRU" for Brussels, "GNT" for Gent; must be unique
   * (Database: station.code)
   */
  code: string;

  /**
   * Latitude in decimal degrees (WGS84)
   * May be null if not yet geocoded
   * (Database: station.latitude)
   */
  latitude?: number | null;

  /**
   * Longitude in decimal degrees (WGS84)
   * May be null if not yet geocoded
   * (Database: station.longitude)
   */
  longitude?: number | null;
}
