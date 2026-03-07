import type { Client } from "@libsql/client";

export async function up(db: Client) {
  await db.execute(
    `ALTER TABLE tournament ADD COLUMN updated_at INTEGER NOT NULL`
  );
}
