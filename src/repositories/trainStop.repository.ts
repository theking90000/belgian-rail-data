/**
 * TrainStopRepository - Data access for TrainStop entity
 * ------------------------------------------------------
 * Specializes BaseRepository for train_stop table.
 */
import type { VehicleResponse } from "@src/irail";
import { BaseRepository } from "../db/baseRepository";
import type { DBConnection } from "../db/connection";
import type { TrainStop } from "../models/trainStop";

export class TrainStopRepository extends BaseRepository<TrainStop> {
  constructor(connection: DBConnection) {
    super("train_stop", connection);
  }

  async upserts(stops: Omit<TrainStop, "id">[]) {
    return await this.connection.transaction(async () => {
      const runIds = [...new Set(stops.map((s) => s.runId))];

      const existing = await this.connection.query(
        `SELECT * FROM ${this.table} WHERE run_id IN (${runIds.map(() => "?").join(",")})`,
        runIds
      );

      /** (runId, stopSequence) */
      const existingMap = new Map<number, Map<number, TrainStop>>();
      for (const row of existing) {
        const ts = this.mapFromDb<TrainStop>(row);
        if (!existingMap.has(ts.runId)) {
          existingMap.set(ts.runId, new Map<number, TrainStop>());
        }
        existingMap.get(ts.runId)!.set(ts.stopSequence, ts);
      }

      const toInsert: Omit<TrainStop, "id">[] = stops.filter(
        (s) =>
          !existingMap.has(s.runId) ||
          !existingMap.get(s.runId)!.has(s.stopSequence)
      );

      const toUpdate: TrainStop[] = stops
        .map((s) => {
          const dataRow = existingMap.get(s.runId)?.get(s.stopSequence);
          return [s, dataRow] as const;
        })
        .filter(([s, dataRow]) => {
          if (!dataRow) return false;
          // Compare fields for changes
          return !this.compareObjects(s, dataRow, ["id"]);
        })
        .map(([s, dataRow]) => ({ ...s, id: dataRow!.id }));

      const insertedStops: TrainStop[] = await this.create(toInsert);

      for (const stop of insertedStops) {
        if (!existingMap.has(stop.runId)) {
          existingMap.set(stop.runId, new Map<number, TrainStop>());
        }
        existingMap.get(stop.runId)!.set(stop.stopSequence, stop);
      }

      for (const stop of toUpdate) {
        await this.update(stop.id!, stop);
        existingMap.get(stop.runId)!.set(stop.stopSequence, stop);
      }

      return stops.map((s) => existingMap.get(s.runId)!.get(s.stopSequence)!);
    });
  }

  /** Utility function to convert API stop data to TrainStop format */
  public convertStop(
    stop: VehicleResponse["stops"]["stop"][number]
  ): Omit<TrainStop, "id" | "runId" | "stationId" | "stopSequence"> {
    const plannedDep = new Date(Number(stop.scheduledDepartureTime) * 1000);
    const plannedArr = new Date(Number(stop.scheduledArrivalTime) * 1000);

    const actualDep = new Date(
      (Number(stop.scheduledDepartureTime) + Number(stop.departureDelay)) * 1000
    );
    const actualArr = new Date(
      (Number(stop.scheduledArrivalTime) + Number(stop.arrivalDelay)) * 1000
    );

    return {
      scheduledArrival: plannedArr.toISOString(),
      scheduledDeparture: plannedDep.toISOString(),
      actualArrival: stop.arrived === "1" ? actualArr.toISOString() : null,
      actualDeparture: stop.left === "1" ? actualDep.toISOString() : null,
      platform: stop.platform,
      delaySec: Number(stop.delay) || null,
      occupancyPct: this.occupancyToPct(stop.occupancy?.name),
    };
  }

  private occupancyToPct(occupancy: string | undefined): number | null {
    if (!occupancy) return null;
    switch (occupancy.toLowerCase()) {
      case "low":
        return 33;
      case "medium":
        return 66;
      case "high":
        return 100;
      default:
        return null;
    }
  }
}
