/**
 * Model: TrainCompositionSegment (train_composition_segment table)
 * ----------------------------------------------------------
 * Represents a segment of a train's composition for a specific run.
 * Defines the origin and destination stations for the segment.
 */

/**
 * TrainCompositionSegment
 *
 * A segment of a train composition, linked to a TrainRun and stations.
 */
export interface TrainCompositionSegment {
  /** Unique, auto-incremented primary key (Database: train_composition_segment.id) */
  id: number;

  /** Reference to TrainRun.id (Database: train_composition_segment.run_id) */
  runId: number;

  /** Reference to Station.id for the origin (Database: train_composition_segment.origin_station_id) */
  originStationId: number;

  /** Reference to Station.id for the destination (Database: train_composition_segment.destination_station_id) */
  destinationStationId: number;
}
