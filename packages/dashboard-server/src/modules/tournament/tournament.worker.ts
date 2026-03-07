import { loadTournament } from "@emily-curry/fgc-sync-common";
import { z } from "zod";
import { Container } from "#container";
import { Config } from "#config";
import { Log } from "#log";
import { TournamentRepository } from "./tournament.repository.js";
import type { Worker } from "../worker.model.js";

const TournamentPayload = z.object({
  slug: z.string(),
});

export class TournamentWorker implements Worker {
  readonly jobType = "tournament";
  private readonly log = Log.child({ module: "TournamentWorker" });

  constructor(private readonly repo: TournamentRepository) {}

  async handle(payload: unknown): Promise<void> {
    const { slug } = TournamentPayload.parse(payload);
    const data = await loadTournament(slug, Config.startgg.apiKey);
    await this.repo.upsert(slug, data);
    this.log.info(`Saved tournament "${data.name}" (${slug})`);
  }
}

Container.register(TournamentWorker, [TournamentRepository]);
