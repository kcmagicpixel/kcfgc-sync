import { Config } from "#config";
import { createClient } from "@libsql/client";
import { MigrationsExecutor } from "./migrations.util.js";

export async function initDatabase() {
  const db = createClient({ url: Config.database.path });

  const migrations = new MigrationsExecutor(db);
  await migrations.execute();

  return db;
}
