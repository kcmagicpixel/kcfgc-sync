import type { Client } from "@libsql/client";

export async function up(db: Client) {
  await db.execute(`
    CREATE TABLE tournament (
      id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
      key TEXT UNIQUE NOT NULL,
      data TEXT NOT NULL
    )
  `);
}
