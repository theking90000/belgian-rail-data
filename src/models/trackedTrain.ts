/**
 * Model: TrackedTrain (tracked_train table)
 * ----------------------------------------------------
 * Represents user/system-specified trains to monitor for processing.
 * Flags which train numbers should be tracked for updates or processing.
 */

/**
 * TrackedTrain
 *
 * Simple manifest of trains to observe in the background (for fetch, scheduler, etc).
 */
export interface TrackedTrain {
  /**
   * Unique, auto-incremented primary key (Database: tracked_train.id)
   */
  id: number;

  /**
   * Public train number (Database: tracked_train.train_number)
   */
  trainNumber: string;

  /**
   * Boolean; if true, this train is currently being tracked (Database: tracked_train.enabled)
   */
  enabled: boolean;
}
