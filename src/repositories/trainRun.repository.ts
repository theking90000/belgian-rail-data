/**
 * TrainRunRepository - Data access for TrainRun entity
 * ----------------------------------------------------
 * Specializes BaseRepository for train_run table. Ready for custom queries.
 */
import { BaseRepository } from '../db/baseRepository';
import type { DBConnection } from '../db/connection';
import type { TrainRun } from '../models/trainRun';

export class TrainRunRepository extends BaseRepository<TrainRun> {
  constructor(connection: DBConnection) {
    super('train_run', connection);
  }
}
