/**
 * Database Connection + Abstraction Layer
 * -----------------------------------------
 * Handles initialization and access to the database.
 *
 * - AGNOSTIC design: supports SQLite first, easily extendable to PostgreSQL.
 * - The exported interface is purposely minimal, with async query/tx scaffolding.
 * - Uses "better-sqlite3" (for SQLite) and outlines hooks for "pg" (for PostgreSQL).
 * - No ORM logic here: just connection, sanity, and raw query helpers.
 *
 * Extension: To add PostgreSQL, implement a class conforming to DBConnection using 'pg'.
 */

import Database from 'better-sqlite3';
// import { Pool } from 'pg' // For future use

export type QueryResult = any[]; // Table-shaped rows (should be typed at repo/DAO)

/**
 * Interface for a DB connection that can be used generically by DAOs.
 */
export interface DBConnection {
  /** Run a query (with params, returns array of rows). */
  query(sql: string, params?: any[]): Promise<QueryResult>;
  /** Run a single row query. */
  get(sql: string, params?: any[]): Promise<any>;
  /** Atomic transaction: pass a callback that is run within the TX block. */
  transaction<T>(fn: () => Promise<T>): Promise<T>;
  /** Closes/shuts down the connection. */
  close(): Promise<void>;
}

/**
 * SQLite specific implementation of DBConnection.
 * For real apps, use pooled/async-driver or migrate to Kysely/knex for unified support.
 */
export class SqliteConnection implements DBConnection {
  private db: Database.Database;

  constructor(filePath: string) {
    this.db = new Database(filePath);
  }

  async query(sql: string, params: any[] = []): Promise<QueryResult> {
    const stmt = this.db.prepare(sql);
    return stmt.all(params);
  }

  async get(sql: string, params: any[] = []): Promise<any> {
    const stmt = this.db.prepare(sql);
    return stmt.get(params);
  }

  async transaction<T>(fn: () => Promise<T>): Promise<T> {
    this.db.exec('BEGIN');
    try {
      const result = await fn();
      this.db.exec('COMMIT');
      return result;
    } catch (e) {
      this.db.exec('ROLLBACK');
      throw e;
    }
  }

  async close(): Promise<void> {
    this.db.close();
  }
}

/**
 * Factory for initializing the appropriate DB backend in future.
 * Pass 'sqlite' or 'postgres' config, or extend for later.
 *
 * Usage:
 *   const db = await createDbConnection({ type: 'sqlite', filePath: 'db.sqlite3' });
 */
export async function createDbConnection(options: {
  type: 'sqlite',
  filePath: string,
}/* | {
  type: 'postgres',
  connectionString: string
}*/) : Promise<DBConnection> {
  if (options.type === 'sqlite') {
    return new SqliteConnection(options.filePath);
  }
  // else if (options.type === 'postgres') {
  //   // Implement PostgresConnection conforming to DBConnection
  //   return new PostgresConnection(options.connectionString);
  // }
  throw new Error('Unsupported DB backend');
}
