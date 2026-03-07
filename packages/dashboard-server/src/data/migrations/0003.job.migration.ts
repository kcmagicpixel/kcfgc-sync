import type { Client } from "@libsql/client";

export async function up(db: Client) {
  await db.execute(`
    CREATE TABLE job (
      id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
      type TEXT NOT NULL,
      state TEXT NOT NULL DEFAULT 'pending',
      run_after INTEGER NOT NULL,
      payload TEXT NOT NULL DEFAULT '{}',
      output TEXT,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    )
  `);
  await db.execute(`
    CREATE INDEX idx_job_poll ON job (state, run_after)
  `);
}
