import type { Client } from "@libsql/client";

export async function up(db: Client) {
  await db.execute(`
    CREATE TABLE post (
      id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
      unique_key TEXT NOT NULL,
      provider TEXT NOT NULL,
      url TEXT NOT NULL,
      created_at INTEGER NOT NULL
    )
  `);
  await db.execute(
    `CREATE UNIQUE INDEX idx_post_unique_key ON post (unique_key)`
  );
}
