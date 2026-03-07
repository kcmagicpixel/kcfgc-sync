import type { Client } from "@libsql/client";
import { Config } from "../../config.js";

export async function up(db: Client) {
  await db.execute(
    `ALTER TABLE user ADD COLUMN role TEXT NOT NULL DEFAULT 'user'`,
  );

  await db.execute({
    sql: `UPDATE user SET role = 'admin' WHERE username = ?`,
    args: [Config.seed.user],
  });
}
