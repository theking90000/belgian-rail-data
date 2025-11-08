/**
 * Model: TrainCompositionUnit (train_composition_unit table)
 * ----------------------------------------------------------
 * Represents the assignment of a material unit to a segment of a train composition.
 * Specifies the order of units within the segment.
 */

/**
 * TrainCompositionUnit
 *
 * Associates a MaterialUnit with a TrainCompositionSegment, including its sequence in the segment.
 */
export interface TrainCompositionUnit {
  /** Reference to TrainCompositionSegment.id (Database: train_composition_unit.segment_id) */
  segmentId: number;

  /** Reference to MaterialUnit.id (Database: train_composition_unit.unit_id) */
  unitId: number;

  /** Sequence/order of the unit in the segment (Database: train_composition_unit.unit_sequence) */
  unitSequence: number;
}
