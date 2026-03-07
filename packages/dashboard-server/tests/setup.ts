import { afterAll, beforeAll } from "vitest";
import { createClient, type Client } from "@libsql/client";
import type { Server } from "node:http";
import { initExpress } from "../src/app.js";
import { Container } from "#container";
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
        } else if (typeof addr === "string") {
          baseUrl = addr;
        } else {
          baseUrl = `http://localhost:${Config.server.port}`;
        }
        resolve();
      });
    });
  });

  afterAll(async () => {
    await new Promise<void>((resolve) => server.close(() => resolve()));
  });
}
