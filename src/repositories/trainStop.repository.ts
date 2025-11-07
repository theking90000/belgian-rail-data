/**
 * TrainStopRepository - Data access for TrainStop entity
 * ------------------------------------------------------
 * Specializes BaseRepository for train_stop table.
 */
import { BaseRepository } from '../db/baseRepository';
import type { DBConnection } from '../db/connection';
import type { TrainStop } from '../models/trainStop';

export class TrainStopRepository extends BaseRepository<TrainStop> {
  constructor(connection: DBConnection) {
    super('train_stop', connection);
  }
}
