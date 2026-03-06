import type { Client } from "@libsql/client";

export async function up(db: Client) {
  await db.execute(`
    CREATE TABLE session (
      id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
      session_id TEXT UNIQUE NOT NULL,
      user_id INTEGER NOT NULL,
      created_at INTEGER NOT NULL,
      deleted_at INTEGER,
      FOREIGN KEY (user_id) REFERENCES user(id)
    )
  `);
}
