import type { Client } from "@libsql/client";

export async function up(db: Client) {
  await db.execute(`ALTER TABLE job ADD COLUMN schedule TEXT`);
}
