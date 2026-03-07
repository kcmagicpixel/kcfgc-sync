import type { Client } from "@libsql/client";

export async function up(db: Client) {
  await db.execute(`
    CREATE TABLE replacement (
      id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
      input TEXT NOT NULL UNIQUE,
      output TEXT NOT NULL,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    )
  `);
}
