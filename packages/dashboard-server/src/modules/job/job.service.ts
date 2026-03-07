import { Container } from "#container";
import { JobRepository } from "./job.repository.js";
import type { Job } from "./job.model.js";

export class JobService {
  constructor(private readonly repo: JobRepository) {}

  async listJobs(): Promise<Job[]> {
    return this.repo.listJobs();
  }

  async createJob(
    type: string,
    payload: unknown,
    runAfter?: number,
  ): Promise<number> {
    return this.repo.createJob(type, payload, runAfter);
  }
}

Container.register(JobService, [JobRepository]);
