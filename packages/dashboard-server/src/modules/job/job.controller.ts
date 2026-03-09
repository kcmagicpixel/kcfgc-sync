import type { Application } from "express";
import type { Controller } from "../controller.model.js";
import { Container } from "#container";
import { JobService } from "./job.service.js";
import { SessionController } from "../session/session.controller.js";

export class JobController implements Controller {
  constructor(
    private readonly session: SessionController,
    private readonly service: JobService
  ) {}

  async register(app: Application) {
    app.get("/api/jobs", this.session.isAuthenticated, async (_req, res) => {
      const jobs = await this.service.listJobs();
      res.json(jobs);
    });

    app.post("/api/jobs/:id/cancel", this.session.isAuthenticated, async (req, res) => {
      const id = Number(req.params.id);
      const cancelled = await this.service.cancelJob(id);
      if (!cancelled) {
        res.status(409).json({ error: "Job is not in pending state or does not exist" });
        return;
      }
      res.json({ ok: true });
    });

    app.post("/api/jobs", this.session.isAuthenticated, async (req, res) => {
      const { type, payload, runAfter, schedule, uniqueKey } = req.body;
      const id = await this.service.createJob(type, payload, runAfter, schedule, uniqueKey);
      res.json({ id });
    });
  }
}

Container.register(JobController, [SessionController, JobService]);
