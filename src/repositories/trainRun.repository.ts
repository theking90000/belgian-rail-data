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
    const tn =
      typeof trainNumber === "number" ? trainNumber.toString() : trainNumber;
    const dt =
      typeof date === "string"
        ? date.slice(0, 10)
        : date.toISOString().slice(0, 10);

    const result = await this.connection.query(
      `SELECT 1 FROM train_run WHERE train_number = ? AND DATE(planned_departure) = ? LIMIT 1`,
      [tn, dt]
    );
    return result.length > 0;
  }

  async upserts(run: Omit<TrainRun, "id">[]): Promise<TrainRun[]> {
    return this.connection.transaction(async () => {
      const existingRuns = await this.connection.query(
        `SELECT * FROM ${this.table} WHERE (train_number, planned_departure) IN (${run.map(() => '(?, ?)').join(', ')})`,
        run.map((r) => [r.trainNumber, r.plannedDeparture]).flat()
      );
      // (trainNumber, plannedDeparture) -> TrainRun
      const existingMap = new Map<string, Map<string, TrainRun>>();
      for (const row of existingRuns) {
        const tr = this.mapFromDb<TrainRun>(row);

        if (!existingMap.has(tr.trainNumber)) {
          existingMap.set(tr.trainNumber, new Map<string, TrainRun>());
        }
        existingMap.get(tr.trainNumber)!.set(tr.plannedDeparture, tr);
      }

      const toInsert: Omit<TrainRun, "id">[] = run.filter(
        (r) =>
          !existingMap.has(r.trainNumber) ||
          !existingMap.get(r.trainNumber)!.has(r.plannedDeparture)
      );

      const toUpdate: TrainRun[] = run
        .map((r) => {
          const dataRow = existingMap
            .get(r.trainNumber)
            ?.get(r.plannedDeparture);
          return [r, dataRow] as const;
        })
        .filter(([r, dataRow]) => {
          if (!dataRow) return false;
          // Compare fields for changes
          return !this.compareObjects(r, dataRow, ["id"]);
        })
        .map(([r, dataRow]) => ({ ...r, id: dataRow!.id }));

      const insertedRuns: TrainRun[] = await this.create(toInsert);

      for (const run of insertedRuns) {
        if (!existingMap.has(run.trainNumber)) {
          existingMap.set(run.trainNumber, new Map<string, TrainRun>());
        }
        existingMap.get(run.trainNumber)!.set(run.plannedDeparture, run);
      }

      for (const run of toUpdate) {
        await this.update(run.id!, run);
        existingMap.get(run.trainNumber)!.set(run.plannedDeparture, run);
      }

      return run.map(
        (r) => existingMap.get(r.trainNumber)!.get(r.plannedDeparture)!
      );
    });
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
