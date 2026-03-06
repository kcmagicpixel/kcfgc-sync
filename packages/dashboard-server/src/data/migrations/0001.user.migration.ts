import type { Client } from "@libsql/client";
import { randomBytes, scrypt } from "node:crypto";
import { promisify } from "node:util";
import { Config } from "../../config.js";

const scryptAsync = promisify(scrypt);

export async function up(db: Client) {
  await db.execute(`
    CREATE TABLE user (
      id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
      username TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL
    )
  `);

  const salt = randomBytes(16).toString("hex");
  const derivedKey = (await scryptAsync(Config.seed.pass, salt, 64)) as Buffer;
  const passwordHash = `${salt}:${derivedKey.toString("hex")}`;

  await db.execute({
    sql: `INSERT INTO user (username, password_hash) VALUES (?, ?)`,
    args: [Config.seed.user, passwordHash],
  });
}
