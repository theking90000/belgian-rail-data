/**
 * TrainCompositionSegmentRepository - Data access for TrainCompositionSegment entity
 * -------------------------------------------------------------------------------
 * Specializes BaseRepository for train_composition_segment table.
 */
import { BaseRepository } from "../db/baseRepository";
import type { DBConnection } from "../db/connection";
import type { TrainCompositionSegment } from "../models/trainCompositionSegment";

export class TrainCompositionSegmentRepository extends BaseRepository<TrainCompositionSegment> {
  constructor(connection: DBConnection) {
    super("train_composition_segment", connection);
  }
}
