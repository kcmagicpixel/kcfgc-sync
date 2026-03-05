import type { Application } from "express";
import type { Controller } from "../base.controller.js";
import { Container } from "../container.js";
import { JobService } from "./job.service.js";
import { SessionController } from "../session/session.controller.js";

export class JobController implements Controller {
  constructor(
    private readonly session: SessionController,
    service: JobService
  ) {}

  async register(app: Application) {
    app.get("/api/jobs", this.session.isAuthenticated, async (req, res) => {
      res.json({ ok: true });
    });
  }
}

Container.register(JobController, [SessionController, JobService]);
