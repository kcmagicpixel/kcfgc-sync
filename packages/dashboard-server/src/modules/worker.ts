import type { Ctor } from "#utils/ctor.type.js";
import { Container } from "#container";
import type { Worker } from "./worker.model.js";
import { WorkerService } from "./job/worker.service.js";
import { TournamentWorker } from "./tournament/tournament.worker.js";
import { HubWorker } from "./tournament/hub.worker.js";
import { PostWorker } from "./post/post.worker.js";

/**
 * List of all worker types to register. These must all be enumerated
 * here or else will be tree-shaken away.
 */
const workerTypes: Array<Ctor<Worker>> = [
  HubWorker,
  TournamentWorker,
  PostWorker,
];

export function initWorkers(): WorkerService {
  const engine = Container.getInstance(WorkerService);
  for (const workerCtor of workerTypes) {
    const worker = Container.getInstance(workerCtor);
    engine.registerWorker(worker);
  }
  return engine;
}
