import type { Ctor } from "#utils/ctor.type.js";
import type { Client } from "@libsql/client";
import type { Application } from "express";
import { AuthController } from "./auth/auth.controller.js";
import type { Controller } from "./controller.model.js";
import { Container } from "#container";
import { DashboardController } from "./express/dashboard.controller.js";
import { RateLimitController } from "./express/rate-limit.controller.js";
import { JobController } from "./job/job.controller.js";
import { SessionController } from "./session/session.controller.js";
import { TournamentController } from "./tournament/tournament.controller.js";
import { PostController } from "./post/post.controller.js";
import { ReplacementController } from "./replacement/replacement.controller.js";

/**
 * List of all controllers to register. Order may matter in some cases.
 * These must all be enumerated here or else will be tree-shaken away.
 */
const orderedControllers: Array<Ctor<Controller>> = [
  SessionController,
  RateLimitController,
  AuthController,
  JobController,
  TournamentController,
  PostController,
  ReplacementController,
  DashboardController, // Always last, contains fallback routes
];

export function initControllers(app: Application) {
  for (const ctrl of orderedControllers) {
    const inst = Container.getInstance(ctrl);
    inst.register(app);
  }
}
