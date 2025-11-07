/**
 * TrainCompositionRepository - Data access for TrainComposition entity
 * -------------------------------------------------------------------
 * Specializes BaseRepository for train_composition table.
 */
import { BaseRepository } from '../db/baseRepository';
import type { DBConnection } from '../db/connection';
import type { TrainComposition } from '../models/trainComposition';

export class TrainCompositionRepository extends BaseRepository<TrainComposition> {
  constructor(connection: DBConnection) {
    super('train_composition', connection);
  }
}
