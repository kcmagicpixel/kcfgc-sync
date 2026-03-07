import type { Client } from "@libsql/client";

export async function up(db: Client) {
  await db.execute(`ALTER TABLE job ADD COLUMN unique_key TEXT`);
  await db.execute(
    `CREATE UNIQUE INDEX idx_job_unique_key ON job (unique_key)`
  );
}
