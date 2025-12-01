/**
 * SQlite Database Connection
 * -----------------------------------------
 */

import Database from "bun:sqlite";
import type { DBConnection, QueryResult } from "./connection";

/**
 * SQLite specific implementation of DBConnection.
 * For real apps, use pooled/async-driver or migrate to Kysely/knex for unified support.
 */
export class SqliteConnection implements DBConnection {
  private db: Database;

  constructor(private readonly filePath: string) {
    this.db = this.createConnection();
  }

  private createConnection(): Database {
    const db = new Database(this.filePath);
    db.run("PRAGMA journal_mode = WAL");
    return db;
  }

  async query(sql: string, params: any[] = []): Promise<QueryResult> {
    const stmt = this.db.prepare(sql);
    return stmt.all(...params);
  }

  async get(sql: string, params: any[] = []): Promise<any> {
    const stmt = this.db.prepare(sql);
    return stmt.get(...params);
  }

  async transaction<T>(fn: () => Promise<T>): Promise<T> {
    if (this.db.inTransaction) return fn();
    return this.db
      .transaction(() => {
        return fn();
      })
      .deferred();
  }

  async close(): Promise<void> {
    this.db.close();
  }
}
