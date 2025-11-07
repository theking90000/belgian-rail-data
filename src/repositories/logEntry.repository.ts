/**
 * LogEntryRepository - Data access for LogEntry entity
 * ----------------------------------------------------
 * Specializes BaseRepository for log_entry table.
 */
import { BaseRepository } from '../db/baseRepository';
import type { DBConnection } from '../db/connection';
import type { LogEntry } from '../models/logEntry';

export class LogEntryRepository extends BaseRepository<LogEntry> {
  constructor(connection: DBConnection) {
    super('log_entry', connection);
  }
}
