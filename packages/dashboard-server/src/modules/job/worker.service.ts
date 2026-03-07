import { Log } from "#log";
import { Config } from "#config";
import { Container } from "#container";
import { JobRepository } from "./job.repository.js";
import type { Worker } from "../worker.model.js";
import { getNextCronDate } from "#utils/cron.util.js";

export class WorkerService {
  private readonly log = Log.child({ module: "WorkerEngine" });
  private readonly workers = new Map<string, Worker>();
  private intervalId: ReturnType<typeof setInterval> | null = null;
  private busy = false;
  private stopping: (() => void) | null = null;

  constructor(private readonly repo: JobRepository) {}

  registerWorker(worker: Worker): void {
    this.log.info(`Registered worker for job type: ${worker.jobType}`);
    this.workers.set(worker.jobType, worker);
  }

  start(): void {
    const { pollIntervalMs } = Config.worker;
    this.log.info(`Starting worker engine, poll interval: ${pollIntervalMs}ms`);
    this.intervalId = setInterval(() => this.tick(), pollIntervalMs);
  }

  stop(): Promise<void> {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    if (this.busy) {
      this.log.info("Waiting for current job to complete before stopping...");
      return new Promise<void>((resolve) => {
        this.stopping = resolve;
      });
    }
    this.log.info("Worker engine stopped");
    return Promise.resolve();
  }

  private async tick(): Promise<void> {
    if (this.busy) return;
    this.busy = true;
    try {
      const { staleTimeoutMs } = Config.worker;
      const reset = await this.repo.resetStaleJobs(staleTimeoutMs);
      if (reset > 0) {
        this.log.warn(`Reset ${reset} stale job(s)`);
      }

      const job = await this.repo.findNextPending();
      if (!job) return;

      const worker = this.workers.get(job.type);
      if (!worker) {
        this.log.warn(`No worker registered for job type: ${job.type}`);
        return;
      }

      const claimed = await this.repo.claimJob(job.id);
      if (!claimed) return;

      this.log.info(`Processing job ${job.id} (type: ${job.type})`);

      try {
        const output = await worker.handle(job.payload);
        await this.repo.completeJob(job.id, output);
        this.log.info(`Job ${job.id} completed`);
      } catch (err) {
        await this.repo.failJob(job.id, err);
        this.log.error(err, `Job ${job.id} failed`);
      }

      if (worker.schedule.type === "recurring") {
        const nextRun = getNextCronDate(worker.schedule.schedule);
        await this.repo.createJob(job.type, job.payload, nextRun.getTime());
        this.log.info(
          `Scheduled next ${job.type} job for ${nextRun.toISOString()}`
        );
      }
    } catch (err) {
      this.log.error(err, "Worker tick error");
    } finally {
      this.busy = false;
      if (this.stopping) {
        this.log.info("Worker engine stopped");
        this.stopping();
        this.stopping = null;
      }
    }
  }
}

Container.register(WorkerService, [JobRepository]);
