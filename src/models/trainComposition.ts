/**
 * Model: TrainComposition (train_composition table)
 * -------------------------------------------------------------------
 * Holds the observed set of vehicles/cars composing a specific TrainRun.
 * Captures snapshots of rolling stock config (for analytics/tracking).
 */

/**
 * TrainComposition
 *
 * A composition snapshot tied to a TrainRun. Includes vehicle data, type,
 * formation, and other tech details as JSON payload.
 */
export interface TrainComposition {
  /**
   * Unique, auto-incremented primary key (Database: train_composition.id)
   */
  id: number;

  /**
   * Foreign key to TrainRun (Database: train_composition.run_id), unique per run
   */
  runId: number;

  /**
   * Date/time this composition was observed/recorded (ISO8601, local) (Database: train_composition.observed_at)
   */
  observedAt: string;

  /**
   * JSON blob with vehicle order, formation, and properties (Database: train_composition.json_composition)
   * The shape isn’t enforced but follows source system spec.
   */
  jsonComposition: any;
}
