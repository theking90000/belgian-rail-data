/**
 * composition-service.ts
 * ----------------------
 * Service for fetching and storing train composition data.
 */

import { IRailAPIClient } from "../irail/irail-client";
import type { DBConnection } from "../db/connection";
import type { TrainCompositionSegmentRepository } from "@src/repositories/trainCompositionSegment.repository";

/**
 * Result/output of a composition fetch attempt
 */
export interface CompositionFetchResult {
  fetched: boolean;
  alreadyUpToDate: boolean;
  segmentsUpdated?: number;
  error?: string;
}

/**
 * Service contract for fetching and persisting a run's composition
 */
export interface CompositionService {
  /**
   * Fetches and persists the train composition for a single run (by train number and date)
   * @param trainNumber - public train number (string or number)
   * @param date - date of run (string YYYY-MM-DD or Date)
   * @param runId - existing TrainRun ID to attach composition to
   * @returns information about the operation (fetched? error?)
   */
  fetchAndStoreComposition(
    trainNumber: string | number,
    date: string | Date,
    runId: number // Existing run ID
  ): Promise<CompositionFetchResult>;
}

/**
 * Default implementation, dependent on IRailAPIClient and DB connection.
 */
export class DefaultCompositionService implements CompositionService {
  constructor(
    private readonly api: IRailAPIClient,
    private readonly trainCompositionSegmentRepository: TrainCompositionSegmentRepository
  ) {}

  /**
   * @inheritdoc
   */
  async fetchAndStoreComposition(
    trainNumber: string | number,
    date: string | Date,
    runId: number
  ): Promise<CompositionFetchResult> {
    // Canonicalize inputs
    const tn =
      typeof trainNumber === "number" ? trainNumber.toString() : trainNumber;
    const dt = IRailAPIClient.toDate(date);

    if (
      await this.trainCompositionSegmentRepository.isCompositionUpToDate(runId)
    ) {
      return { fetched: false, alreadyUpToDate: true };
    }

    // Fetch composition data from IRail API
    let compositionData;
    try {
      compositionData = await this.api.getComposition({ id: tn, date: dt });
    } catch (e) {
      return {
        fetched: false,
        alreadyUpToDate: false,
        error: `IRail API error: ${e}`,
      };
    }
    if (
      !compositionData ||
      !compositionData.composition ||
      !compositionData.composition.segments
    ) {
      return {
        fetched: false,
        alreadyUpToDate: false,
        error: "No composition data in API response.",
      };
    }

    // Insert into train_composition (as JSON)
    const updated =
      await this.trainCompositionSegmentRepository.saveCompositionSegments(
        runId,
        compositionData.composition.segments.segment
      );

    return {
      fetched: true,
      alreadyUpToDate: false,
      segmentsUpdated: updated,
    };
  }
}
