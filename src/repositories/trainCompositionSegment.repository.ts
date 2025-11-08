/**
 * TrainCompositionSegmentRepository - Data access for TrainCompositionSegment entity
 * -------------------------------------------------------------------------------
 * Specializes BaseRepository for train_composition_segment table.
 */
import type { CompositionResponse } from "@src/irail/types";
import { BaseRepository } from "../db/baseRepository";
import type { DBConnection } from "../db/connection";
import type { TrainCompositionSegment } from "../models/trainCompositionSegment";
import type { StationRepository } from "./station.repository";
import type { TrainCompositionUnitRepository } from "./trainCompositionUnit.repository";
import type { MaterialUnitRepository } from "./materialUnit.repository";

export class TrainCompositionSegmentRepository extends BaseRepository<TrainCompositionSegment> {
  constructor(
    connection: DBConnection,
    private readonly stationRepository: StationRepository,
    private readonly trainCompositionUnitRepository: TrainCompositionUnitRepository,
    private readonly materialUnitRepository: MaterialUnitRepository
  ) {
    super("train_composition_segment", connection);
  }

  /**
   * Checks if a train composition segment exists for the given train number and date.
   * @param trainNumber - The train number (string or number)
   * @param date - The date (Date or string)
   * @returns Promise<boolean> - true if a segment exists, false otherwise
   */
  async isCompositionUpToDate(runId: number): Promise<boolean> {
    const result = await this.connection.query(
      `SELECT 1 FROM ${this.table} WHERE run_id = ? LIMIT 1`,
      [runId]
    );
    return result.length > 0;
  }

  async upserts(
    segments: Omit<TrainCompositionSegment, "id">[]
  ): Promise<TrainCompositionSegment[]> {
    return this._upserts(segments, [
      "runId",
      "originStationId",
      "destinationStationId",
    ]);
  }

  /**
   * Persists or updates all segments for a given train run.
   * - Inserts or updates all `train_composition_segment` records for the specified run.
   *
   * @param runId - The ID of the train run.
   * @param segments - Array of composition segments from the IRail API response.
   * @returns Number of segments inserted or updated.
   */
  async saveCompositionSegments(
    runId: number,
    segments: CompositionResponse["composition"]["segments"]["segment"]
  ): Promise<number> {
    return this.connection.transaction(async () => {
      const stations = await this.stationRepository.upserts(
        segments
          .map((s) => [s.origin, s.destination])
          .flat()
          .map((s) => ({
            code: s.id,
            name: s.name,
            latitude: parseFloat(s.locationY),
            longitude: parseFloat(s.locationX),
          }))
      );

      const upsertSegments = await this.upserts(
        segments.map((seg, index) => ({
          runId,
          originStationId: stations[index * 2]!.id,
          destinationStationId: stations[index * 2 + 1]!.id,
        }))
      );

      for (let i = 0; i < upsertSegments.length; i++) {
        const units = await this.materialUnitRepository.addMaterialUnits(
          segments[i]!.composition.units.unit!
        );

        await this.trainCompositionUnitRepository.upserts(
          units.map((u, j) => ({
            segmentId: upsertSegments[i]!.id,
            unitId: u?.id, // Sometimes fails here, to investigate
            unitSequence: j,
          }))
        );
      }

      return upsertSegments.length;
    });
  }
}
