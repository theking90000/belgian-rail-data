 /**
 * train-run-service.ts
 * ----------------------
 * Fetches and persists stop/delay data for an actual train run on a given day
 * using the IRailAPIClient and a repository layer.
 */

import { IRailAPIClient } from "../irail/irail-client";
import type { TrainRunRepository } from "../repositories/trainRun.repository";

/**
 * Outcome of fetchAndStoreRun.
 */
export interface TrainRunFetchResult {
    fetched: boolean;
    alreadyUpToDate: boolean;
    stopsUpdated?: number;
    error?: string;
}

/**
 * Service contract for fetching and persisting a single train run's details.
 */
export interface TrainRunService {
    /**
     * Fetch and persist all stop/delay details for a given train number + date.
     * Does nothing if already up to date or run cannot be found.
     *
     * @param trainNumber Public train number (string or number)
     * @param date Date (YYYY-MM-DD or Date)
     * @returns Status/result indicating fetch outcome
     */
    fetchAndStoreRun(trainNumber: string | number, date: string | Date): Promise<TrainRunFetchResult>;
}

export class DefaultTrainRunService implements TrainRunService {
    constructor(
        private readonly api: IRailAPIClient,
        private readonly repository: TrainRunRepository
    ) {}

    /**
     * @inheritdoc
     */
    async fetchAndStoreRun(trainNumber: string | number, date: string | Date): Promise<TrainRunFetchResult> {
        // Lookup canonical run in DB to check if already persisted
        let tn = typeof trainNumber === "number" ? trainNumber.toString() : trainNumber;

        tn =  tn.replace(/\D+/g, "");

        const dt = typeof date === "string"
            ? date.slice(8, 10) + date.slice(5, 7) + date.slice(2, 4)
            : date.getDate().toString().padStart(2, "0") +
              (date.getMonth() + 1).toString().padStart(2, "0") +
              date.getFullYear().toString().slice(2, 4);

        if (await this.repository.isRunUpToDate(tn, date)) {
            return { fetched: false, alreadyUpToDate: true };
        }

        // Call IRail API to get stops/delays
        let runData;
        try {
            runData = await this.api.getVehicle({ id: tn, date: dt });
        } catch (e: any) {
            return { fetched: false, alreadyUpToDate: false, error: String(e) };
        }

        if (!runData?.stops?.stop?.length) {
            return { fetched: false, alreadyUpToDate: false, error: "No run data available for this train/date" };
        }

        // Persist to database via repository (simplified)
        const updated = await this.repository.saveRunStops(tn, dt, runData.vehicleinfo, runData.stops.stop);

        return {
            fetched: true,
            alreadyUpToDate: false,
            stopsUpdated: updated,
        };
    }
}