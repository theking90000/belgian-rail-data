/**
 * Model: TrainRun (train_run table)
 * ----------------------------------------------------------
 * Represents a single operational instance of a train on a specific day.
 * Encapsulates both planned and actual timing, plus origin and destination.
 * Serves as the core entity for tracking each journey through the system.
 */

/**
 * TrainRun
 *
 * An individual train's operational run, uniquely identified and connected
 * to its stops (TrainStop), composition (TrainComposition), and vehicles.
 */
export interface TrainRun {
  /**
   * Unique, auto-incremented primary key (Database: train_run.id)
   */
  id: number;

  /**
   * Type of train (Database: train_run.train_type)
   */
  trainType: string;

  /**
   * Public train number, unique per day/route (Database: train_run.train_number)
   */
  trainNumber: string;

  /**
   * Reference to Station.id of the departure station (Database: train_run.departure_station_id)
   */
  departureStationId: number;

  /**
   * Reference to Station.id of the arrival station (Database: train_run.arrival_station_id)
   */
  arrivalStationId: number;

  /**
   * Scheduled departure time (local, ISO 8601) (Database: train_run.planned_departure)
   */
  plannedDeparture: string;

  /**
   * Scheduled arrival time (local, ISO 8601) (Database: train_run.planned_arrival)
   */
  plannedArrival: string;

  /**
   * Actual departure time (nullable, if not yet departed) (Database: train_run.actual_departure)
   */
  actualDeparture?: string | null;

  /**
   * Actual arrival time (nullable, if not yet arrived) (Database: train_run.actual_arrival)
   */
  actualArrival?: string | null;
}
