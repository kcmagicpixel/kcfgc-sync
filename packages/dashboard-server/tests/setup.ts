import { afterAll, beforeAll } from "vitest";
import { createClient, type Client } from "@libsql/client";
import type { Server } from "node:http";
import { initExpress } from "../src/app.js";
import { Container } from "#container";
import { up as userMigration } from "../src/data/migrations/0001.user.migration.js";
import { up as sessionMigration } from "../src/data/migrations/0002.session.migration.js";
import { up as jobMigration } from "../src/data/migrations/0003.job.migration.js";
import { up as tournamentMigration } from "../src/data/migrations/0004.tournament.migration.js";
import { up as jobScheduleMigration } from "../src/data/migrations/0005.job-schedule.migration.js";
import { up as tournamentUpdatedAtMigration } from "../src/data/migrations/0006.tournament-updated-at.migration.js";
import { up as jobUniqueKeyMigration } from "../src/data/migrations/0007.job-unique-key.migration.js";
import { up as postMigration } from "../src/data/migrations/0008.post.migration.js";
import { up as imageMigration } from "../src/data/migrations/0009.image.migration.js";
import { Config } from "../src/config.js";
import { initControllers } from "../src/modules/controller.js";
import { MigrationsExecutor } from "../src/data/migrations.util.js";

let server: Server;
let baseUrl: string;
let db: Client;

export function getBaseUrl() {
  return baseUrl;
}

export function getDb() {
  return db;
}

export function extractCookie(res: Response): string | undefined {
  return res.headers.getSetCookie?.()[0]?.split(";")[0];
}

export function setupTestDb() {
  beforeAll(async () => {
    db = createClient({ url: Config.database.path });
    const migrations = new MigrationsExecutor(db);
    await migrations.execute();

    Container.registerSingleton("db", db);
  });

  afterAll(() => {
    db.close();
  });
}

export function setupTestServer() {
  setupTestDb();

  beforeAll(async () => {
    const app = await initExpress();
    initControllers(app);

    await new Promise<void>((resolve) => {
      server = app.listen(Config.server.port, () => {
        const addr = server.address();
        if (typeof addr === "object" && addr) {
          baseUrl = `http://localhost:${addr.port}`;
        }
        resolve();
      });
    });
  });

  afterAll(async () => {
    await new Promise<void>((resolve) => server.close(() => resolve()));
  });
}
