import type { Client } from "@libsql/client";
import type { Application } from "express";
import { Container } from "./container.js";
import { JobController } from "./job/job.controller.js";
import { DashboardController } from "./dashboard/dashboard.controller.js";
import type { Controller } from "./base.controller.js";
import type { Ctor } from "../utils/ctor.type.js";
import { SessionController } from "./session/session.controller.js";

/**
 * List of all controllers to register. Order may matter in some cases.
 * These must all be enumerated here or else will be tree-shaken away.
 */
const orderedControllers: Array<Ctor<Controller>> = [
  SessionController,
  JobController,
  DashboardController, // Always last, contains fallback routes
];

export function initModules(db: Client, app: Application) {
  Container.registerSingleton("db", db);

  for (const ctrl of orderedControllers) {
    const inst = Container.getInstance(ctrl);
    inst.register(app);
  }
}
