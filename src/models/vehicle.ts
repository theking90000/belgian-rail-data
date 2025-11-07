/**
 * Model: Vehicle (vehicle table)
 * -------------------------------------------
 * Represents a rolling stock vehicle (locomotive or carriage).
 * Allows storing static info by vehicle number/type/description for reporting and analysis.
 */

/**
 * Vehicle
 *
 * Rolling stock definition. Not necessarily linked to every train composition directly,
 * but supports inventory and analytic use cases.
 */
export interface Vehicle {
  /**
   * Unique, auto-incremented primary key (Database: vehicle.id)
   */
  id: number;

  /**
   * The official vehicle number (Database: vehicle.vehicle_number)
   */
  vehicleNumber: string;

  /**
   * Vehicle type (“EMU”, “loc”, etc) or classification (nullable) (Database: vehicle.type)
   */
  type?: string | null;

  /**
   * Optional freeform description (Database: vehicle.description)
   */
  description?: string | null;
}
