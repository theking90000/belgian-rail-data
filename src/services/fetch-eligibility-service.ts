/**
 * FetchEligibilityService contract—determines if/when a real-time fetch for a train run is warranted.
 * Depends on GTFS ground truth for schedule and the train_run DB for up-to-date-ness.
 */

import type { GTFSService } from "./gtfs-service";
import type { TrainRunRepository } from "../repositories/trainRun.repository";

/**
 * The result of an eligibility check for fetching real-time train run data.
 */
export interface FetchEligibilityResult {
  /** Is it allowed to fetch real-time (IRail) info for this train/date right now? */
  canFetchNow: boolean;
  /** If must wait, specifies the Date/time to try again (e.g., not yet departed). */
  waitUntil?: Date;
  /** True if the train does not run (per GTFS schedule). */
  notRunning?: boolean;
  /** Optional debug/explanation details. */
  details?: string;
}

/**
 * Contract for service that decides fetch eligibility based on GTFS and local DB state.
 */
export interface FetchEligibilityService {
  /**
   * Check if fetching IRail run/vehicle for this train number and date is advisable and allowed.
   * @param trainNumber - the public train number
   * @param date - scheduled run date (string or Date)
   * @returns Eligibility result (can fetch now, or when/whether to try)
   */
  getFetchEligibility(
    trainNumber: string,
    date: string | Date
  ): Promise<FetchEligibilityResult>;
}

/**
 * Default implementation of FetchEligibilityService using GTFS schedule as ground truth.
 */
export class DefaultFetchEligibilityService implements FetchEligibilityService {
  // TODO: implements a mechanism that if the train is not arrived after 30mn
  // It would reschedule a fetch later to see "how late" the train is.

  private static ELIGBLE_FOR_FETCH_AFTER_MINUTES = 30; // 30 minutes after scheduled arrival.

  constructor(
    private readonly gtfs: GTFSService,
    private readonly trainRunRepository: TrainRunRepository
  ) {}

  /**
   * Checks if you can fetch IRail for this train/date.
   * Rules:
   * - If GTFS schedule does not exist: notRunning = true
   * - If today < scheduled arrival + x min: wait (returns waitUntil)
   * - If DB already has an up-to-date run: canFetchNow = false, details: "Already up to date" (define not up-to-date?)
   * - Else: canFetchNow = true
   */
  async getFetchEligibility(
    trainNumber: string,
    date: string | Date
  ): Promise<FetchEligibilityResult> {
    // 1. Get the canonical GTFS schedule
    const schedule = await this.gtfs.getSchedule(trainNumber, date);

    if (!schedule) {
      return {
        canFetchNow: false,
        notRunning: true,
        details: "No GTFS run found (train does not operate on this date)",
      };
    }

    const lastStop = schedule.stops[0];
    if (!lastStop || !lastStop.scheduledArrival) {
      return {
        canFetchNow: false,
        details: "No scheduled arrival in GTFS",
      };
    }

    // 2. Parse GTFS arrival time as Date
    const plannedArr = new Date(lastStop.scheduledArrival);

    // 3. Determine if it's too soon to fetch ("not yet departed" grace period)
    const now = new Date();
    const earliestAllowed = new Date(
      plannedArr.getTime() -
        DefaultFetchEligibilityService.ELIGBLE_FOR_FETCH_AFTER_MINUTES * 60_000
    );

    if (now < earliestAllowed) {
      return {
        canFetchNow: false,
        waitUntil: earliestAllowed,
        details: `It's too early to fetch; try at or after ${earliestAllowed.toLocaleTimeString()}`,
      };
    }

    // 4. If we already have an up-to-date run, skip fetching
    const runUpToDate = await this.trainRunRepository.isRunUpToDate(
      trainNumber,
      date
    );
    if (runUpToDate) {
      return {
        canFetchNow: false,
        details: "Train run already up-to-date in DB",
      };
    }

    // 5. Otherwise, fetching is allowed
    return {
      canFetchNow: true,
      details: "Eligible for IRail fetch",
    };
  }
}
