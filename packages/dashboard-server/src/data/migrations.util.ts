import type { Client } from "@libsql/client";
import { readdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { Log } from "../log.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export class MigrationsExecutor {
  private readonly log = Log.child({ module: "Migrations" });

  private readonly TABLE_CREATE = `
    CREATE TABLE IF NOT EXISTS migrations (
    id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
    name TEXT NOT NULL,
    created_at INTEGER NOT NULL
  )`;

  constructor(private readonly db: Client) {}

  public async execute() {
    await this.db.execute(this.TABLE_CREATE);

    const files = await readdir(path.join(__dirname, "migrations"));
    for (const filename of files) {
      const migrationRows = await this.db.execute(
        `SELECT * FROM migrations where name = ?`,
        [filename]
      );
      if (migrationRows.rows.length > 0) {
        this.log.trace(`Skipping migration ${filename}, already executed`);
        continue;
      }
      const filePath = path.join(__dirname, "migrations", filename);
      const mod = await import(filePath);
      if (typeof mod["up"] !== "function") {
        throw new Error(`No up function in file ${filename}`);
      }
      this.log.info(`Executing migration ${filename}`);
      await mod["up"](this.db);
      await this.db.execute(
        `INSERT INTO migrations (name, created_at) VALUES (?, ?)`,
        [filename, Date.now()]
      );
    }
  }
}
