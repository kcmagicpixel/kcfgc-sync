import type { Application } from "express";
import type { Controller } from "../controller.model.js";
import { Container } from "#container";
import { SessionController } from "../session/session.controller.js";
import { ReplacementRepository } from "./replacement.repository.js";

export class ReplacementController implements Controller {
  constructor(
    private readonly session: SessionController,
    private readonly repo: ReplacementRepository
  ) {}

  async register(app: Application) {
    app.get(
      "/api/replacements",
      this.session.isAuthenticated,
      async (_req, res) => {
        const replacements = await this.repo.findAll();
        res.json(replacements);
      }
    );

    app.post(
      "/api/replacements",
      this.session.isAuthenticated,
      async (req, res) => {
        const { input, output } = req.body;
        const id = await this.repo.insert(input, output);
        res.json({ id });
      }
    );

    app.put(
      "/api/replacements/:id",
      this.session.isAuthenticated,
      async (req, res) => {
        const id = Number(req.params.id);
        const { input, output } = req.body;
        await this.repo.update(id, input, output);
        res.json({ ok: true });
      }
    );

    app.delete(
      "/api/replacements/:id",
      this.session.isAuthenticated,
      async (req, res) => {
        const id = Number(req.params.id);
        await this.repo.deleteById(id);
        res.json({ ok: true });
      }
    );
  }
}

Container.register(ReplacementController, [
  SessionController,
  ReplacementRepository,
]);
