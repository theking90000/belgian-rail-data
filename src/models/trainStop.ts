/**
 * Model: TrainStop (train_stop table)
 * ---------------------------------------------------
 * Represents an individual stop by a train as part of a run.
 * Includes scheduled/actual arrival/departure times, stop sequence,
 * platform info, occupancy, and delay.
 */

/**
 * TrainStop
 *
 * Each stop that a TrainRun makes at a Station, in trip order with optional real-time metrics/fields.
 */
export interface TrainStop {
  /**
   * Unique, auto-incremented primary key (Database: train_stop.id)
   */
  id: number;

  /**
   * Foreign key to TrainRun (run) (Database: train_stop.run_id)
   */
  runId: number;

  /**
   * Foreign key to Station (Database: train_stop.station_id)
   */
  stationId: number;

  /**
   * Sequence number for stop within train run (Database: train_stop.stop_sequence)
   */
  stopSequence: number;

  /**
   * Scheduled arrival time (ISO8601, local) (Database: train_stop.scheduled_arrival)
   */
  scheduledArrival: string;

  /**
   * Actual arrival time (nullable, ISO8601) (Database: train_stop.actual_arrival)
   */
  actualArrival?: string | null;

  /**
   * Scheduled departure time (ISO8601) (Database: train_stop.scheduled_departure)
   */
  scheduledDeparture: string;

  /**
   * Actual departure time (nullable, ISO8601) (Database: train_stop.actual_departure)
   */
  actualDeparture?: string | null;

  /**
   * Platform string (nullable, may not be present in some stations) (Database: train_stop.platform)
   */
  platform?: string | null;

  /**
   * Delay in seconds since scheduled (nullable, can be computed or real-time) (Database: train_stop.delay_sec)
   */
  delaySec?: number | null;

  /**
   * Occupancy percentage if available (0-100, nullable) (Database: train_stop.occupancy_pct)
   */
  occupancyPct?: number | null;
}
