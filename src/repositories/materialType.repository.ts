/**
 * MaterialTypeRepository - Data access for MaterialType entity
 * -----------------------------------------------------------
 * Specializes BaseRepository for material_type table.
 */
import { BaseRepository } from "../db/baseRepository";
import type { DBConnection } from "../db/connection";
import type { MaterialType } from "../models/materialType";

export class MaterialTypeRepository extends BaseRepository<MaterialType> {
  constructor(connection: DBConnection) {
    super("material_type", connection);
  }
}
