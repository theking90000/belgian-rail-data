/**
 * MaterialUnitRepository - Data access for MaterialUnit entity
 * -----------------------------------------------------------
 * Specializes BaseRepository for material_unit table.
 */
import { BaseRepository } from "../db/baseRepository";
import type { DBConnection } from "../db/connection";
import type { MaterialUnit } from "../models/materialUnit";

export class MaterialUnitRepository extends BaseRepository<MaterialUnit> {
  constructor(connection: DBConnection) {
    super("material_unit", connection);
  }
}
