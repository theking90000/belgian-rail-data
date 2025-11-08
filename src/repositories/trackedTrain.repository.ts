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

  async addTrackedTrain(trainId: string) {
    trainId = trainId.replace(/\D+/g, "");
    const row = await this.connection.query(
      `UPDATE ${this.table} SET enabled = 1, tracked_since = ? WHERE train_number = ? RETURNING id`,
      [new Date().toISOString(), trainId]
    );

    if (row.length === 0) {
      await this.create({
        enabled: true,
        trainNumber: trainId,
        trackedSince: new Date().toISOString(),
      });
    }
  }

  async removeTrackedTrain(trainId: string) {
    trainId = trainId.replace(/\D+/g, "");
    await this.connection.query(
      `UPDATE ${this.table} SET enabled = 0 WHERE train_number = ?`,
      [trainId]
    );
  }
}
