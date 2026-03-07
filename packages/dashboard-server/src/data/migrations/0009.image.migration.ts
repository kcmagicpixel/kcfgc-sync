import type { Client } from "@libsql/client";

export async function up(db: Client) {
  await db.execute(`
    CREATE TABLE image (
      id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
      data BLOB NOT NULL,
      mime_type TEXT NOT NULL,
      created_at INTEGER NOT NULL
    )
  `);
}
