import type { Client } from "@libsql/client";
import { Container } from "../container.js";

export class JobRepository {
  constructor(private readonly db: Client) {}
}

Container.register(JobRepository, ["db"]);
