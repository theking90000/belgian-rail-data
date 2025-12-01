/**
 * SQlite Database Connection
 * -----------------------------------------
 */

import { Pool, type PoolClient } from "pg";
import type { DBConnection, QueryResult } from "./connection";

import { AsyncLocalStorage } from "node:async_hooks";

/**
 * SQLite specific implementation of DBConnection.
 * For real apps, use pooled/async-driver or migrate to Kysely/knex for unified support.
 */
export class PostgresConnection implements DBConnection {
  private db: Pool;

  private tx: AsyncLocalStorage<PoolClient | null> = new AsyncLocalStorage({
    defaultValue: null,
  });

  constructor(
    private connectionString: string,
    private debug: boolean = false
  ) {
    this.db = this.createConnection();
  }

  private createConnection(): Pool {
    const db = new Pool({
      connectionString: this.connectionString,
      max: 5,
    });
    return db;
  }

  private fixQuery(sql: string): string {
    sql = sql
      .replaceAll("INTEGER PRIMARY KEY AUTOINCREMENT", "SERIAL PRIMARY KEY")
      .replaceAll("DATETIME", "TIMESTAMPTZ")
      .replaceAll("BOOLEAN DEFAULT 1", "BOOLEAN DEFAULT true")
      .replaceAll("BOOLEAN DEFAULT 0", "BOOLEAN DEFAULT false")
      .replaceAll("strftime('%Y-%m-%dT%H:%M:%fZ', 'now')", "CURRENT_TIMESTAMP");

    let i = 1;
    while (sql.indexOf("?") !== -1) {
      sql = sql.replace("?", "$" + i);
      i++;
    }

    if (this.debug) console.log(sql);

    return sql;
  }

  private fixResponse(rows: any[][]): any[][] {
    rows?.forEach((row) =>
      Object.keys(row).forEach((col) => {
        if (
          typeof row[col as any] === "object" &&
          row[col as any] instanceof Date
        ) {
          row[col as any] = (row[col as any] as Date).toISOString();
        }
      })
    );

    return rows;
  }

  async query(sql: string, params: any[] = []): Promise<QueryResult> {
    sql = this.fixQuery(sql);

    const db = this.tx.getStore() || (await this.db.connect());
    const r = await db.query(sql, params);

    if (!this.tx.getStore()) db.release();
    return this.fixResponse(r.rows);
  }

  async get(sql: string, params: any[] = []): Promise<any> {
    sql = this.fixQuery(sql);

    const db = this.tx.getStore() || (await this.db.connect());
    const r = await db.query(sql, params);

    if (!this.tx.getStore()) db.release();
    return this.fixResponse(r.rows)[0];
  }

  async transaction<T>(fn: () => Promise<T>): Promise<T> {
    // if (this.db.inTransaction) return fn();

    let db = this.tx.getStore();
    let c = false;

    if (!db) {
      db = await this.db.connect();
      c = true;
      this.tx.enterWith(db);
      await db.query("BEGIN");
      if (this.debug) console.log("BEGIN TX");
    }

    let results: T;
    try {
      results = await fn();
    } catch (e) {
      if (this.debug) console.log("ROLLBACK TX");
      await db.query("ROLLBACK");
      db.release();
      this.tx.enterWith(null);
      c = false;
      throw e;
    } finally {
      if (c) {
        if (this.debug) console.log("COMMIT TX");
        await db.query("COMMIT");
        db.release();
        this.tx.enterWith(null);
      }
    }

    return results;
  }

  async close(): Promise<void> {
    await this.db.end();
  }
}
