import type { Application } from "express";
import type { Controller } from "../controller.model.js";
import { Container } from "#container";
import { TournamentService } from "./tournament.service.js";
import { TournamentRepository } from "./tournament.repository.js";
import { SessionController } from "../session/session.controller.js";

function extractDraftText(description?: string): string {
  if (!description) return "";
  const moreIdx = description.indexOf("<!--more-->");
  if (moreIdx !== -1) return description.slice(0, moreIdx).trimEnd();
  const nlIdx = description.indexOf("\n");
  if (nlIdx !== -1) return description.slice(0, nlIdx).trimEnd();
  return description;
}

export class TournamentController implements Controller {
  constructor(
    private readonly session: SessionController,
    private readonly service: TournamentService,
    private readonly repo: TournamentRepository,
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

    app.get(
      "/api/tournaments/:key/draft-post",
      this.session.isAuthenticated,
      async (req, res) => {
        const tournament = await this.repo.findByKey(req.params.key as string);
        if (!tournament) {
          res.status(404).json({ error: "Tournament not found" });
          return;
        }

        const data = tournament.data as {
          slug?: string;
          name?: string;
          url?: string;
          startDate?: string;
          description?: string;
          images?: { url: string; type: string }[];
        };

        const TWO_DAYS_MS = 2 * 24 * 60 * 60 * 1000;
        const runAfter = data.startDate
          ? new Date(data.startDate).getTime() - TWO_DAYS_MS
          : Date.now();

        const bannerUrl = data.images?.find((i) => i.type === "banner")?.url;

        res.json({
          text: extractDraftText(data.description),
          key: data.slug ?? tournament.key,
          runAfter,
          embed: { url: data.url ?? "", title: data.name ?? "" },
          ...(bannerUrl ? { embedImageUrl: bannerUrl } : {}),
        });
      },
    );
  }
}

Container.register(TournamentController, [
  SessionController,
  TournamentService,
  TournamentRepository,
]);
