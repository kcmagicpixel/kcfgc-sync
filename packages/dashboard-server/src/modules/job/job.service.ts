import { Container } from "#container";
import { JobRepository } from "./job.repository.js";
import type { Job } from "./job.model.js";

export class JobService {
  constructor(private readonly repo: JobRepository) {}

  async listJobs(): Promise<Job[]> {
    return this.repo.listJobs();
  }

  async cancelJob(id: number): Promise<boolean> {
    return this.repo.cancelJob(id);
  }

  async createJob(
    type: string,
    payload: unknown,
    runAfter?: number,
    schedule?: string | null,
    uniqueKey?: string | null
  ): Promise<number | null> {
    return this.repo.createJob(type, payload, runAfter, schedule, uniqueKey);
  }
}

Container.register(JobService, [JobRepository]);
