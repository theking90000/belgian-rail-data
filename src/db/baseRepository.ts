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

  /**
   * Insert a new entity or entities and return them with PK populated.
   * Supports single or bulk insert.
   */
  async create<E extends Omit<T, 'id'> | Omit<T, 'id'>[]>(
    entity: E
  ): Promise<E extends any[] ? T[] : T> {
    const entities = Array.isArray(entity) ? entity : [entity];
    if (entities.length === 0) {
      if (Array.isArray(entity)) return [] as any;
      return Promise.reject(new Error('No entities to insert')) as any;
    }

    const dataArr = entities.map(e => this.mapToDb(e));
    const fields = Object.keys(dataArr[0] as Record<string, any>);
    const placeholders = '(' + fields.map(_ => '?').join(', ') + ')';
    const allPlaceholders = dataArr.map(_ => placeholders).join(', ');
    const sql = `INSERT INTO ${this.table} (${fields.join(', ')}) VALUES ${allPlaceholders} RETURNING *`;
    const params = dataArr.flatMap(obj => fields.map(f => obj[f]));
    const rows = await this.connection.query(sql, params);
    const mapped = rows.map(row => this.mapFromDb<T>(row));
    return (Array.isArray(entity) ? mapped : mapped[0]) as any;
  }

  /** Get entity by primary key (id). */
  async getById(id: number): Promise<T | null> {
    const sql = `SELECT * FROM ${this.table} WHERE id = ?`;
    const row = await this.connection.get(sql, [id]);
    return row ? this.mapFromDb<T>(row) : null;
  }

  /** List all entities (optionally with WHERE). */
  async list(where?: Partial<T>): Promise<T[]> {
    let sql = `SELECT * FROM ${this.table}`;
    let params: any[] = [];
    if (where && Object.keys(where).length) {
      const conds = Object.keys(where).map(field => `${this.camelToSnake(field)} = ?`);
      sql += ' WHERE ' + conds.join(' AND ');
      params = Object.values(where);
    }
    const rows = await this.connection.query(sql, params);
    return rows.map(row => this.mapFromDb<T>(row));
  }

  /** Update entity by id. Returns updated row. */
  async update(id: number, updates: Partial<T>): Promise<T | null> {
    const data = this.mapToDb(updates);
    const sets = Object.keys(data).map(k => `${k} = ?`).join(', ');
    const sql = `UPDATE ${this.table} SET ${sets} WHERE id = ? RETURNING *`;
    const rows = await this.connection.query(sql, [...Object.values(data), id]);
    return rows.length ? this.mapFromDb<T>(rows[0]) : null;
  }

  /** Delete entity by id. Returns boolean for success. */
  async delete(id: number): Promise<boolean> {
    const sql = `DELETE FROM ${this.table} WHERE id = ?`;
    await this.connection.query(sql, [id]);
    return true;
  }

    /** Utility function to convert camelCase to snake_case. */
  protected camelToSnake(str: string): string {
    return str.replace(/([A-Z])/g, '_$1').toLowerCase();
  } 

  /** Utility to map JS object keys to snake_case for SQL. */
  protected mapToDb<T extends object>(obj: T): Record<string, any> {
    const out: Record<string, any> = {};
    for (const k in obj) {
      out[this.camelToSnake(k)] = (obj as any)[k];
    }
    return out;
  }

  /** Utility to map DB row (snake_case) to camelCase JS entity. */
  protected mapFromDb<T>(row: any): T {
    const out: Record<string, any> = {};
    for (const k in row) {
      out[k.replace(/_([a-z])/g, (_, g) => g.toUpperCase())] = row[k];
    }
    return out as T;
  }

  protected compareObjects<O1 extends object, O2 extends object>(obj1: O1, obj2: O2, omit: string[]=[]): boolean {
    const keys1 = Object.keys(obj1).filter(x=>!omit.includes(x)) as (keyof O1)[];
    const keys2 = Object.keys(obj2).filter(x=>!omit.includes(x)) as (keyof O2)[];
    if (keys1.length !== keys2.length) return false;
    for (let i = 0; i < keys1.length; i++) {
      if(keys1[i] !== keys2[i]) return false;
      const v1 :any = obj1[keys1[i]!];
      const v2 :any = obj2[keys2[i]!];
      if (v1 !== v2) return false;
    }
    return true;
  }
}