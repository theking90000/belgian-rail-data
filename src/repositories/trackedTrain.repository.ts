/**
 * TrackedTrainRepository - Data access for TrackedTrain entity
 * -----------------------------------------------------------
 * Specializes BaseRepository for tracked_train table.
 */
import { BaseRepository } from "../db/baseRepository";
import type { DBConnection } from "../db/connection";
import type { TrackedTrain } from "../models/trackedTrain";

export class TrackedTrainRepository extends BaseRepository<TrackedTrain> {
  constructor(connection: DBConnection) {
    super("tracked_train", connection);
  }

  async getTrackedTrains(): Promise<TrackedTrain[]> {
    return this.list({ enabled: true });
  }
}
