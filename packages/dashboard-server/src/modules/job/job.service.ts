import { Container } from "../container.js";
import { JobRepository } from "./job.repository.js";

export class JobService {
  constructor(repo: JobRepository) {}
}

Container.register(JobService, [JobRepository]);
