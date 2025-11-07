/**
 * BaseRepository: Generic Data Access Layer
 * -----------------------------------------------------
 * Provides strongly-typed CRUD operations for any entity/model.
 *
 * - Uses the DBConnection abstraction (backend-agnostic)
 * - CamelCase TS fields ↔ snake_case DB columns mapping utilities
 * - Can be safely subclassed for entity-specific DAOs
 * - Extensible: add query helpers or override methods
 *
 * Usage example (in a concrete repo):
 *   class StationRepository extends BaseRepository<Station> { ... }
 */
import { type DBConnection } from './connection';

/** Utility function to convert camelCase to snake_case. */
function camelToSnake(str: string): string {
  return str.replace(/([A-Z])/g, '_$1').toLowerCase();
}

/** Utility to map JS object keys to snake_case for SQL. */
function mapToDb<T extends object>(obj: T): Record<string, any> {
  const out: Record<string, any> = {};
  for (const k in obj) {
    out[camelToSnake(k)] = (obj as any)[k];
  }
  return out;
}

/** Utility to map DB row (snake_case) to camelCase JS entity. */
function mapFromDb<T>(row: any): T {
  const out: Record<string, any> = {};
  for (const k in row) {
    out[k.replace(/_([a-z])/g, (_, g) => g.toUpperCase())] = row[k];
  }
  return out as T;
}

export abstract class BaseRepository<T> {
  protected table: string;
  protected connection: DBConnection;

  /**
   * @param table Table name as in DB (snake_case)
   * @param connection DBConnection instance
   */
  constructor(table: string, connection: DBConnection) {
    this.table = table;
    this.connection = connection;
  }

  /** Insert a new entity and return it with PK populated. */
  async create(entity: Omit<T, 'id'>): Promise<T> {
    const data = mapToDb(entity);
    const fields = Object.keys(data).join(', ');
    const placeholders = Object.keys(data).map(_ => '?').join(', ');
    const sql = `INSERT INTO ${this.table} (${fields}) VALUES (${placeholders}) RETURNING *`;
    const rows = await this.connection.query(sql, Object.values(data));
    return mapFromDb<T>(rows[0]);
  }

  /** Get entity by primary key (id). */
  async getById(id: number): Promise<T | null> {
    const sql = `SELECT * FROM ${this.table} WHERE id = ?`;
    const row = await this.connection.get(sql, [id]);
    return row ? mapFromDb<T>(row) : null;
  }

  /** List all entities (optionally with WHERE). */
  async list(where?: Partial<T>): Promise<T[]> {
    let sql = `SELECT * FROM ${this.table}`;
    let params: any[] = [];
    if (where && Object.keys(where).length) {
      const conds = Object.keys(where).map(field => `${camelToSnake(field)} = ?`);
      sql += ' WHERE ' + conds.join(' AND ');
      params = Object.values(where);
    }
    const rows = await this.connection.query(sql, params);
    return rows.map(mapFromDb) as T[];
  }

  /** Update entity by id. Returns updated row. */
  async update(id: number, updates: Partial<T>): Promise<T | null> {
    const data = mapToDb(updates);
    const sets = Object.keys(data).map(k => `${k} = ?`).join(', ');
    const sql = `UPDATE ${this.table} SET ${sets} WHERE id = ? RETURNING *`;
    const rows = await this.connection.query(sql, [...Object.values(data), id]);
    return rows.length ? mapFromDb<T>(rows[0]) : null;
  }

  /** Delete entity by id. Returns boolean for success. */
  async delete(id: number): Promise<boolean> {
    const sql = `DELETE FROM ${this.table} WHERE id = ?`;
    await this.connection.query(sql, [id]);
    return true;
  }
}