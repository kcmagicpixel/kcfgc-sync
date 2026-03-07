import { loadHub } from "@emily-curry/fgc-sync-common";
import { Container } from "#container";
import { Log } from "#log";
import { JobRepository } from "../job/job.repository.js";
import type { Worker, WorkerSchedule } from "../worker.model.js";

export class HubWorker implements Worker {
  readonly jobType = "hub";
  readonly schedule: WorkerSchedule = { type: "once" };
  private readonly log = Log.child({ module: "HubWorker" });

  constructor(private readonly jobRepo: JobRepository) {}

  async handle(payload: unknown): Promise<unknown> {
    const { slug, limit } = payload as { slug: string; limit: number };
    const hub = await loadHub(slug, limit);

    this.log.info(
      `Hub "${hub.name}" returned ${hub.tournaments.length} tournaments`,
    );

    for (const tournament of hub.tournaments) {
      await this.jobRepo.createJob("tournament", { slug: tournament.slug });
    }

    return { created: hub.tournaments.length };
  }
}

Container.register(HubWorker, [JobRepository]);
