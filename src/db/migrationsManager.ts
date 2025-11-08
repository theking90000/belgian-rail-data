import type { DBConnection } from "./connection";

export class MigrationsManager {
  constructor(
    private readonly dbConnection: DBConnection,
    private readonly migrations: string[] = []
  ) {}

  private async setup() {
    await this.dbConnection.query(
      "CREATE TABLE IF NOT EXISTS migrations (id INTEGER PRIMARY KEY,applied_at TEXT)"
    );
  }

  private async lastMigration() {
    const row = await this.dbConnection.query(
      "SELECT id FROM migrations ORDER BY id DESC LIMIT 1"
    );
    return row.length === 1 ? row[0].id : -1;
  }

  private async setMigrationApplied(id: number): Promise<void> {
    await this.dbConnection.query(
      "INSERT INTO migrations (id, applied_at) VALUES (?, ?)",
      [id, new Date().toISOString()]
    );
  }

  async migrate(): Promise<void> {
    await this.dbConnection.transaction(async () => {
      await this.setup();
      const lastApplied = await this.lastMigration();
      for (let i = lastApplied + 1; i < this.migrations.length; i++) {
        await this.applyMigration(this.migrations[i]!);

        await this.setMigrationApplied(i);
      }
    });
  }

  private async applyMigration(migration: string): Promise<void> {
    const mg = migration.split(";");
    for (const stmt of mg) {
      const trimmed = stmt.trim();
      if (trimmed.length > 0) {
        await this.dbConnection.query(trimmed);
      }
    }
  }
}
