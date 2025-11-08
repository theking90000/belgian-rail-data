/**
 * Model: MaterialUnit (material_unit table)
 * ----------------------------------------------------------
 * Represents a specific physical unit of rolling stock, linked to a material type.
 * Each unit is uniquely identified and can be referenced in train compositions.
 */

/**
 * MaterialUnit
 *
 * An individual rolling stock unit, associated with a MaterialType and identified by unit number.
 */
export interface MaterialUnit {
  /** Unique, auto-incremented primary key (Database: material_unit.id) */
  id: number;

  /** Reference to MaterialType.id (Database: material_unit.material_type_id) */
  materialTypeId: number;

  /** Unique unit number (Database: material_unit.unit_number) */
  unitNumber: string;
}
