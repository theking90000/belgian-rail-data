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
    return this._upserts(stops, ["runId", "stopSequence"]);
  }

  /** Utility function to convert API stop data to TrainStop format */
  public convertStop(
    stop: VehicleResponse["stops"]["stop"][number]
  ): Omit<TrainStop, "id" | "runId" | "stationId" | "stopSequence"> {
    const plannedDep = new Date(Number(stop.scheduledDepartureTime) * 1000);
    const plannedArr = new Date(Number(stop.scheduledArrivalTime) * 1000);

    const actualDep = new Date(
      (Number(stop.scheduledDepartureTime) + Number(stop.departureDelay || 0)) *
        1000
    );
    const actualArr = new Date(
      (Number(stop.scheduledArrivalTime) + Number(stop.arrivalDelay || 0)) *
        1000
    );

    return {
      scheduledArrival: plannedArr.toISOString(),
      scheduledDeparture: plannedDep.toISOString(),
      actualArrival: stop.arrived === "1" ? actualArr.toISOString() : null,
      actualDeparture: stop.left === "1" ? actualDep.toISOString() : null,
      platform: stop.platform,
      delaySec: Number(stop.delay) || 0,
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
