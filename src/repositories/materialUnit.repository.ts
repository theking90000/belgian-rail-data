/**
 * MaterialUnitRepository - Data access for MaterialUnit entity
 * -----------------------------------------------------------
 * Specializes BaseRepository for material_unit table.
 */
import type { CompositionResponse } from "@src/irail/types";
import { BaseRepository } from "../db/baseRepository";
import type { DBConnection } from "../db/connection";
import type { MaterialUnit } from "../models/materialUnit";
import type { MaterialTypeRepository } from "./materialType.repository";

type Unit =
  CompositionResponse["composition"]["segments"]["segment"][number]["composition"]["units"]["unit"][number];

export class MaterialUnitRepository extends BaseRepository<MaterialUnit> {
  constructor(
    connection: DBConnection,
    private readonly materialTypeRepository: MaterialTypeRepository
  ) {
    super("material_unit", connection);
  }

  async upserts(units: Omit<MaterialUnit, "id">[]): Promise<MaterialUnit[]> {
    return this._upserts(units, ["materialTypeId", "unitNumber"]);
  }

  async addMaterialUnits(units: Unit[]): Promise<MaterialUnit[]> {
    return this.connection.transaction(async () => {
      const types = await this.materialTypeRepository.upserts(
        units.map((unit) => ({
          typeName: unit.materialType.parent_type,
          subTypeName: unit.materialType.sub_type,

          hasToilets: unit.hasToilets === "1",
          hasSecondClassOutlets: unit.hasSecondClassOutlets === "1",
          hasFirstClassOutlets: unit.hasFirstClassOutlets === "1",
          hasHeating: unit.hasHeating === "1",
          hasAirco: unit.hasAirco === "1",
          tractionType: unit.tractionType,
          canPassToNextUnit: unit.canPassToNextUnit === "1",
          seatsFirstClass: Number(unit.seatsFirstClass),
          seatsCoupeFirstClass: Number(unit.seatsCoupeFirstClass),
          standingPlacesFirstClass: Number(unit.standingPlacesFirstClass),
          seatsSecondClass: Number(unit.seatsSecondClass),
          seatsCoupeSecondClass: Number(unit.seatsCoupeSecondClass),
          standingPlacesSecondClass: Number(unit.standingPlacesSecondClass),
          lengthInMeter: Number(unit.lengthInMeter),
          hasSemiAutomaticInteriorDoors:
            unit.hasSemiAutomaticInteriorDoors === "1",
          tractionPosition: Number(unit.tractionPosition),
          hasPrmSection: unit.hasPrmSection === "1",
          hasPriorityPlaces: unit.hasPriorityPlaces === "1",
          hasBikeSection: unit.hasBikeSection === "1",
        }))
      );

      const upsertedUnits = await this.upserts(
        units.map((unit, i) => ({
          unitNumber: unit.materialNumber,
          materialTypeId: types[i]!.id,
        }))
      );

      return upsertedUnits;
    });
  }
}
