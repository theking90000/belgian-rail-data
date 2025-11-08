/**
 * wake-service.ts
 * ----------------
 * Service contract and implementation for batch/evented wake processing of tracked trains.
 *
 * - Provides methods to process all tracked trains or a single train for the current day
 * - Integrates eligibility checks before processing
 * - Designed for extensibility and maintainability with clear separation of concerns
 * - All methods and types fully documented for future maintainability
 */

import type { FetchEligibilityService } from "./fetch-eligibility-service";
import type { TrainRunService } from "./train-run-service";
import type { TrackedTrainRepository } from "../repositories/trackedTrain.repository";
import type { CompositionService } from "./composition-service";

/**
 * Contract for batch/evented wake processing of tracked trains.
 * - Can process a single trainNumber or all tracked trains for the current day.
 */
export interface WakeService {
  /**
   * Immediately wake and process all enabled tracked trains for today.
   */
  wake(): Promise<void>;

  /**
   * Process a single trainNumber for today (fetch + store if eligible).
   * @param trainNumber - The public train number
   */
  process(trainNumber: string): Promise<void>;
}

/**
 * Default implementation: processes fetch/store for all tracked trains if eligible.
 */
export class DefaultWakeService implements WakeService {
  constructor(
    private readonly trackedTrainRepo: TrackedTrainRepository,
    private readonly fetchEligibility: FetchEligibilityService,
    private readonly trainRunService: TrainRunService,
    private readonly compositionService: CompositionService
  ) {}

  /**
   * Wakes and processes all tracked trains for today, running process() for each eligible train.
   */
  async wake(): Promise<void> {
    console.log(
      " * [wake-service] Waking and processing all tracked trains for today"
    );
    const today = new Date();
    const tracked = await this.trackedTrainRepo.getTrackedTrains();

    for (const train of tracked) {
      const eligibility = await this.fetchEligibility.getFetchEligibility(
        train.trainNumber,
        today
      );
      if (eligibility.canFetchNow) {
        console.log(` * [wake-service] Processing train ${train.trainNumber}`);
        await this.process(train.trainNumber);
      } else {
        console.log(
          ` * [wake-service] Skipping train ${train.trainNumber}, not eligible because ${eligibility.details}`
        );
        // Optionally log or collect pending, e.g., waiting until eligibility.waitUntil
      }
    }
  }

  /**
   * Processes a single train.
   * DOES NOT check eligibility; assumes caller has done so.
   * @param trainNumber - The public train number
   */
  async process(trainNumber: string): Promise<void> {
    const today = new Date();

    const result = await this.trainRunService.fetchAndStoreRun(
      trainNumber,
      today
    );

    if (!result.runId || !result.fetched) return;

    await this.compositionService.fetchAndStoreComposition(
      trainNumber,
      today,
      result.runId
    );
  }
}
