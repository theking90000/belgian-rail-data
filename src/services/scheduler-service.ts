/**
 * scheduler-service.ts
 * --------------------
 * Service contract and implementation for orchestrating polling and processing of tracked trains.
 *
 * - Periodically checks tracked trains and processes those eligible for updates
 * - Delegates eligibility checks and processing to injected services
 * - Sleeps until the next eligible train or a default interval if none are pending
 * - Supports graceful shutdown via a stop method
 * - All methods and types fully documented for future maintainability
 */

import type { TrackedTrainRepository } from "../repositories/trackedTrain.repository";
import type { FetchEligibilityService } from "./fetch-eligibility-service";
import type { WakeService } from "./wake-service";

/**
 * SchedulerService contract. Orchestrates polling and processing for tracked trains.
 */
export interface SchedulerService {
  /**
   * Start the polling loop, delegating to WakeService's process method as appropriate.
   */
  runScheduler(): Promise<void>;
  /**
   * Stop the scheduler (for graceful shutdown).
   */
  stop(): void;
}

/**
 * Scheduler that periodically checks tracked trains, processes those eligible,
 * and sleeps for min(waitUntil) if nothing can be processed yet.
 */
export class DefaultSchedulerService implements SchedulerService {
  private stopped = false;

  constructor(
    private readonly trackedTrainRepo: TrackedTrainRepository,
    private readonly fetchEligibility: FetchEligibilityService,
    private readonly wakeService: WakeService
  ) {}

  async runScheduler(): Promise<void> {
    this.stopped = false;
    console.log(" * Scheduler started");
    while (!this.stopped) {
      const today = new Date();
      const tracked = await this.trackedTrainRepo.getTrackedTrains();
      console.log(` * Fetched ${tracked.length} tracked trains`);

      let nextWake: Date | null = null;
      let didWork = false;

      for (const train of tracked) {
        const eligibility = await this.fetchEligibility.getFetchEligibility(
          train.trainNumber,
          today
        );

        if (eligibility.canFetchNow) {
          console.log(` * Processing train ${train.trainNumber}`);
          await this.wakeService.process(train.trainNumber);
          didWork = true;
        } else if (eligibility.waitUntil) {
          if (!nextWake || eligibility.waitUntil < nextWake) {
            nextWake = eligibility.waitUntil;
          }
          console.log(
            ` * Train ${
              train.trainNumber
            } not eligible, next check at ${eligibility.waitUntil.toISOString()}`
          );
        }
        // Skip not running or already up-to-date
      }

      if (!didWork && nextWake) {
        const ms = nextWake.getTime() - Date.now();
        if (ms > 0) {
          console.log(` * Sleeping until next eligible train in ${ms} ms`);
          await this.delay(ms);
          continue;
        }
      }

      // If nothing to do and no pending eligibility, default sleep 1 minute
      if (!didWork && !nextWake) {
        console.log(" * No eligible trains, sleeping for 60 seconds");
        await this.delay(60_000);
      }
    }
    console.log(" * Scheduler stopped");
  }

  stop(): void {
    this.stopped = true;
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
