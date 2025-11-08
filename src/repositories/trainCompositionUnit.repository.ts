/**
 * TrainCompositionUnitRepository - Data access for TrainCompositionUnit entity
 * --------------------------------------------------------------------------
 * Specializes BaseRepository for train_composition_unit table.
 */
import { BaseRepository } from "../db/baseRepository";
import type { DBConnection } from "../db/connection";
import type { TrainCompositionUnit } from "../models/trainCompositionUnit";

export class TrainCompositionUnitRepository extends BaseRepository<TrainCompositionUnit> {
  constructor(connection: DBConnection) {
    super("train_composition_unit", connection);
  }
}
