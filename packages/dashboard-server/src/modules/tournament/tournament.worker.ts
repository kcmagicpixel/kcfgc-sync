import { loadTournament } from "@emily-curry/fgc-sync-common";
import { Container } from "#container";
import { Config } from "#config";
import { Log } from "#log";
import { TournamentRepository } from "./tournament.repository.js";
import type { Worker, WorkerSchedule } from "../worker.model.js";

export class TournamentWorker implements Worker {
  readonly jobType = "tournament";
  readonly schedule: WorkerSchedule = { type: "once" };
  private readonly log = Log.child({ module: "TournamentWorker" });

  constructor(private readonly repo: TournamentRepository) {}

  async handle(payload: unknown): Promise<void> {
    const { slug } = payload as { slug: string };
    const data = await loadTournament(slug, Config.startgg.apiKey);
    await this.repo.upsert(slug, data);
    this.log.info(`Saved tournament "${data.name}" (${slug})`);
  }
}

Container.register(TournamentWorker, [TournamentRepository]);
