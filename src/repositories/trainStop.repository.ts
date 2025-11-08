/**
 * TrainStopRepository - Data access for TrainStop entity
 * ------------------------------------------------------
 * Specializes BaseRepository for train_stop table.
 */
import type { VehicleResponse } from "@src/irail/types";
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

  /**
   * Retrieves all stops for a given train number within a specified time range.
   *
   * @param trainNumber The train number to filter by.
   * @param after The start date/time for filtering stops (inclusive).
   * @param before The end date/time for filtering stops (inclusive).
   * @param filterAtStop Optional array of station IDs to further filter stops by station.
   * @returns A promise resolving to an array of TrainStop objects.
   */
  async getStopsForTrainNumber(
    trainNumber: string,
    after?: Date,
    before?: Date,
    filterAtStop: number[] = []
  ): Promise<TrainStop[]> {
    trainNumber = trainNumber.replace(/\D+/g, ""); // Remove leading zeros

    const rows = await this.connection.query(
      `SELECT ts.* FROM train_run tr
       JOIN train_stop ts ON ts.run_id = tr.id
       WHERE tr.train_number = ? 
         ${after ? "AND ts.scheduled_arrival >= ?" : ""}
         ${before ? "AND ts.scheduled_arrival <= ?" : ""}
         ${
           filterAtStop.length > 0
             ? "AND ts.station_id IN (" +
               filterAtStop.map((f) => "?").join(",") +
               ")"
             : ""
         }
       ORDER BY ts.scheduled_arrival ASC, ts.stop_sequence ASC`,
      [
        trainNumber,
        after ? after.toISOString() : undefined,
        before ? before.toISOString() : undefined,
        ...filterAtStop,
      ].filter((x) => x !== undefined)
    );

    return rows.map(this.mapFromDb) as TrainStop[];
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
