import type { TrainRunRepository } from "@src/repositories/trainRun.repository";
import { SqliteConnection } from "../db/sqlite";
import type { TrainCompositionSegmentRepository } from "@src/repositories/trainCompositionSegment.repository";
import { IRailAPIClient } from "@src/irail/irail-client";
import type {
  CompositionResponse,
  StationPoint,
  VehicleResponse,
} from "@src/irail/types";

/**
 * database-importer.ts
 * -----------------------
 * Service for importing data from an old database version.
 */

/**
 * Result/output of a database import attempt
 */
export interface DatabaseImportResult {
  imported: boolean;
  recordsImported?: number;
  error?: string;
}

/**
 * Service contract for importing data from an old database file
 */
export interface DatabaseImporter {
  /**
   * Imports data from the specified database file path into the current database.
   * @param filePath - Path to the old database file
   * @returns information about the operation
   */
  importDatabase(filePath: string): Promise<DatabaseImportResult>;
}

type Stop = VehicleResponse["stops"]["stop"][number];
type Station = Stop["stationinfo"];
type VehicleInfo = VehicleResponse["vehicleinfo"];

/**
 * Default implementation, dependent on DB connection.
 */
export class DefaultDatabaseImporter implements DatabaseImporter {
  constructor(
    private readonly trainRunRepository: TrainRunRepository,
    private readonly trainCompositionSegmentRepository: TrainCompositionSegmentRepository,
    private readonly irail: IRailAPIClient
  ) {}

  /**
   * @inheritdoc
   */
  async importDatabase(filePath: string): Promise<DatabaseImportResult> {
    try {
      const stations = await this.irail.requestApi<{ station: Station[] }>(
        "/stations"
      );
      const stationMap = new Map<string, Station>();
      for (const station of stations.station) {
        stationMap.set(station.name, station);
      }

      const conn = new SqliteConnection(filePath);

      const data: any[] = await conn.query(`SELECT * FROM vehicle_stops 
        ORDER BY date, vehicle_id, stop_index`);

      let i = data.length;

      // For each group of (vehicle_id, date) Generate the results of IRail Api then store them
      await this.partitionBy(["vehicle_id", "date"], data, async (group) => {
        if (group.length === 0) return;

        let trainID = group[0].vehicle_id.replace(/\D+/g, "");
        let date = this.parseOldDateAndTime(
          group[0].date,
          group[0].scheduled_departure_time
        );
        const typeMatch = group[0].vehicle_id.match(/^([A-Za-z]+)(\d+)/);
        const type = typeMatch ? typeMatch[1] : "";

        const vehicleInfo: VehicleInfo = {
          "@id": `"http://irail.be/vehicles/BE.NMBS.${group[0].vehicle_id}`,
          shortname: type + " " + trainID,
          number: trainID,
          type: type,
          locationX: "0",
          locationY: "0",
          name: `BE.NMBS.${group[0].vehicle_id}`,
        };

        const stops = group.map((row) => {
          const station = stationMap.get(row.station_name);
          if (!station)
            throw new Error(`Station not found: ${row.station_name}`);

          return {
            id: String(row.stop_index),
            station: row.station_name,
            stationinfo: station,
            time: String(
              this.parseOldDateAndTime(
                row.date,
                row.scheduled_departure_time
              ).getTime() / 1000
            ),
            platform: String(row.platform),
            platforminfo: { name: String(row.platform), normal: "1" },
            scheduledDepartureTime: String(
              this.parseOldDateAndTime(
                row.date,
                row.scheduled_departure_time
              ).getTime() / 1000
            ),
            scheduledArrivalTime: String(
              this.parseOldDateAndTime(
                row.date,
                row.scheduled_arrival_time
              ).getTime() / 1000
            ),
            delay: String(row.delay),
            arrivalCanceled: row.arrival_canceled ? "1" : "0",
            departureCanceled: row.departure_canceled ? "1" : "0",
            canceled: row.arrival_canceled ? "1" : "0",
            arrivalDelay: String(row.arrival_delay),
            departureDelay: String(row.departure_delay),
            left: row.arrival_canceled ? "0" : "1",
            arrived: row.arrival_canceled ? "0" : "1",
            isExtraStop: "0",
            occupancy: {
              "@id": "http://api.irail.be/terms/" + row.occupancy,
              name: row.occupancy,
            },
            departureConnection: "undefined",
          } as Stop;
        });

        await this.trainRunRepository.saveRunStops(
          trainID,
          date,
          vehicleInfo,
          stops
        );
      });
      console.log(`[Import] Imported ${i} train runs/stops.`);

      const comp: any[] = await conn.query(`SELECT * FROM vehicle_composition 
        ORDER BY date, vehicle_id`);

      i += comp.length;

      // For each group of (vehicle_id, date) Generate the results of IRail Api then store them
      await this.partitionBy(["vehicle_id", "date"], comp, async (group) => {
        let trainID = group[0].vehicle_id.replace(/\D+/g, "");
        let date = this.parseOldDateAndTime(
          group[0].date,
          0 // time not relevant for composition
        );

        const run = await this.trainRunRepository.getRun(trainID, date);

        if (!run) {
          console.error(
            `Train run not found for composition import: ${trainID} on ${date
              .toISOString()
              .slice(0, 10)}`
          );
          return;
        }

        const data = JSON.parse(group[0].m_detailed);

        try {
          await this.trainCompositionSegmentRepository.saveCompositionSegments(
            run.id,
            data.segment
          );
        } catch (e) {
          console.error(
            `Error importing composition for ${trainID} on ${date
              .toISOString()
              .slice(0, 10)}: ${e instanceof Error ? e.message : String(e)}`
          );
        }
      });

      console.log(`[Import] Imported ${i} train composition segments.`);

      return {
        imported: true,
        recordsImported: i,
      };
    } catch (e) {
      return {
        imported: false,
        error: `Import error: ${e instanceof Error ? e.message : String(e)}`,
      };
    }
  }

  private parseOldDateAndTime(date: number, time: number): Date {
    const day = Math.floor(date / 10000);
    const month = Math.floor((date % 10000) / 100) - 1; // JS months are 0-based
    const year = 2000 + (date % 100); // Assumes 21st century

    const hours = Math.floor(time / 100);
    const minutes = time % 100;

    return new Date(Date.UTC(year, month, day, hours, minutes));
  }

  private async partitionBy<T>(
    key: (keyof T)[],
    data: T[],
    callback: (items: T[]) => Promise<void>
  ) {
    let currentKey = null;
    let currentGroup: T[] = [];
    for (const item of data) {
      if (
        currentKey === null ||
        !key.every((k, i) => currentKey![i] === item[k])
      ) {
        if (currentGroup.length > 0) {
          await callback(currentGroup);
        }
        currentKey = key.map((k) => item[k]);
        currentGroup = [item];
      } else {
        currentGroup.push(item);
      }
    }

    if (currentGroup.length > 0) {
      await callback(currentGroup);
    }
  }
}
