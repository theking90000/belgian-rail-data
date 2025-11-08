/**
 * TrainRunRepository - Data access for TrainRun entity
 * ----------------------------------------------------
 * Specializes BaseRepository for train_run table. Ready for custom queries.
 */
import { BaseRepository } from "../db/baseRepository";
import type { DBConnection } from "../db/connection";
import type { TrainRun } from "../models/trainRun";

import type { VehicleResponse } from "@src/irail/types";
import type { StationRepository } from "./station.repository";
import type { TrainStopRepository } from "./trainStop.repository";

export class TrainRunRepository extends BaseRepository<TrainRun> {
  constructor(
    connection: DBConnection,
    private stationRepository: StationRepository,
    private trainStopRepository: TrainStopRepository
  ) {
    super("train_run", connection);
    this.stationRepository = stationRepository;
  }

  /**
   * Checks if a train run exists for the given train number and date.
   * @param trainNumber - The train number (string or number)
   * @param date - The date (Date or string)
   * @returns Promise<boolean> - true if up to date, false otherwise
   */
  async isRunUpToDate(
    trainNumber: string | number,
    date: Date | string
  ): Promise<boolean> {
    return (await this.getRun(trainNumber, date)) !== null;
  }

  async getRun(
    trainNumber: string | number,
    date: Date | string
  ): Promise<TrainRun | null> {
    let tn =
      typeof trainNumber === "number" ? trainNumber.toString() : trainNumber;

    tn = tn.replace(/\D+/g, "");

    const dt =
      typeof date === "string"
        ? date.slice(0, 10)
        : date.toISOString().slice(0, 10);

    const row = await this.connection.get(
      `SELECT * FROM train_run WHERE train_number = ? AND DATE(planned_departure) = ? LIMIT 1`,
      [tn, dt]
    );
    return row ? this.mapFromDb(row) : null;
  }

  async upserts(run: Omit<TrainRun, "id">[]): Promise<TrainRun[]> {
    return this._upserts(run, ["trainNumber", "plannedDeparture"]);
  }

  /**
   * Persists or updates the run and all stops for this train/date.
   * - Ensures stations exist in `station`
   * - Finds/creates one `train_run`
   * - Inserts/updates all `train_stop`s for this run
   *
   * @param trainNumber - string or number (public number)
   * @param date - string or Date (YYYY-MM-DD)
   * @param stops - array of IRail vehicleApi stops
   * @returns Number of stops inserted/updated
   */
  async saveRunStops(
    trainNumber: string | number,
    date: Date | string,
    vehicleInfo: VehicleResponse["vehicleinfo"],
    stops: VehicleResponse["stops"]["stop"]
  ): Promise<number> {
    if (stops.length === 0) {
      return 0;
    }

    const tn =
      typeof trainNumber === "number" ? trainNumber.toString() : trainNumber;
    const dt =
      typeof date === "string"
        ? date.slice(0, 10)
        : date.toISOString().slice(0, 10);

    return this.connection.transaction(async () => {
      // 1. Upsert each station and get IDs
      const stations = await this.stationRepository.upserts(
        stops.map((s) => ({
          name: s.stationinfo.standardname || "Unknown",
          code: s.stationinfo.id,
          latitude: parseFloat(s.stationinfo.locationY),
          longitude: parseFloat(s.stationinfo.locationX),
        }))
      );

      // 2. Find/create one train_run for this day/number (use first/last stop for planned/actual fields)
      const firstStop = stops[0]!,
        lastStop = stops[stops.length - 1]!;
      // Get station ids
      const departureStationId = stations[0]!.id;
      const arrivalStationId = stations[stations.length - 1]!.id;
      // parse dates
      const plannedDep = new Date(
        Number(firstStop.scheduledDepartureTime) * 1000
      );
      const plannedArr = new Date(Number(lastStop.scheduledArrivalTime) * 1000);

      const actualDep = new Date(
        (Number(firstStop.scheduledDepartureTime) +
          Number(firstStop.departureDelay)) *
          1000
      );
      const actualArr = new Date(
        (Number(lastStop.scheduledArrivalTime) +
          Number(lastStop.arrivalDelay)) *
          1000
      );

      // TODO: (for later) handle cancelled runs/stops

      // UPSERT train_run (update if exists, insert if new)
      const [run] = await this.upserts([
        {
          trainType: vehicleInfo.type,
          trainNumber: tn,
          departureStationId,
          arrivalStationId,
          plannedDeparture: plannedDep.toISOString(),
          plannedArrival: plannedArr.toISOString(),
          actualDeparture: actualDep.toISOString(),
          actualArrival: actualArr.toISOString(),
        },
      ]);

      const runId = run!.id;

      const insertedStops = await this.trainStopRepository.upserts(
        stops.map((s, i) => ({
          ...this.trainStopRepository.convertStop(s),
          runId,
          stationId: stations[i]!.id,
          stopSequence: i,
        }))
      );

      return insertedStops.length;
    });
  }
}
