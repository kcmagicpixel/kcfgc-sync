import type { Application } from "express";
import type { Controller } from "../controller.model.js";
import { Container } from "#container";
import { TournamentService } from "./tournament.service.js";
import { SessionController } from "../session/session.controller.js";

export class TournamentController implements Controller {
  constructor(
    private readonly session: SessionController,
    private readonly service: TournamentService,
  ) {}

  async register(app: Application) {
    app.get(
      "/api/tournaments",
      this.session.isAuthenticated,
      async (_req, res) => {
        const tournaments = await this.service.listAll();
        res.json(tournaments);
      },
    );
  }
}

Container.register(TournamentController, [SessionController, TournamentService]);
