import { afterAll, beforeAll } from "vitest";
import { createClient, type Client } from "@libsql/client";
import type { Server } from "node:http";
import { initExpress } from "../src/app.js";
import { Container } from "../src/modules/container.js";
import { SessionController } from "../src/modules/session/session.controller.js";
import { AuthController } from "../src/modules/auth/auth.controller.js";
import { up as userMigration } from "../src/data/migrations/0001.user.migration.js";
import { up as sessionMigration } from "../src/data/migrations/0002.session.migration.js";
import { Config } from "../src/config.js";

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
    await userMigration(db);
    await sessionMigration(db);

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
    const sessionCtrl = Container.getInstance(SessionController);
    const authCtrl = Container.getInstance(AuthController);
    await sessionCtrl.register(app);
    await authCtrl.register(app);

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
