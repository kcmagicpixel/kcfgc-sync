import { loadHub } from "@emily-curry/fgc-sync-common";
import { z } from "zod";
import { Container } from "#container";
import { Log } from "#log";
import type { Worker } from "../worker.model.js";
import { TournamentWorker } from "./tournament.worker.js";

const HubPayload = z.object({
  slug: z.string(),
  limit: z.number().int().positive(),
});

export class HubWorker implements Worker {
  readonly jobType = "hub";
  private readonly log = Log.child({ module: "HubWorker" });

  constructor(private readonly tournamentWorker: TournamentWorker) {}

  async handle(payload: unknown): Promise<unknown> {
    const { slug, limit } = HubPayload.parse(payload);
    const hub = await loadHub(slug, limit);

    this.log.info(
      `Hub "${hub.name}" returned ${hub.tournaments.length} tournaments`
    );

    for (const tournament of hub.tournaments) {
      await this.tournamentWorker.handle({ slug: tournament.slug });
    }

    return { created: hub.tournaments.length };
  }
}

Container.register(HubWorker, [TournamentWorker]);
