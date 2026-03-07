import type { Client } from "@libsql/client";
import { Config } from "../../config.js";
import { hashPassword } from "../../utils/password.util.js";

export async function up(db: Client) {
  await db.execute(`
    CREATE TABLE user (
      id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
      username TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL
    )
  `);

  const passwordHash = await hashPassword(Config.seed.pass);

  await db.execute({
    sql: `INSERT INTO user (username, password_hash) VALUES (?, ?)`,
    args: [Config.seed.user, passwordHash],
  });
}
