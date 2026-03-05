import type { Client } from "@libsql/client";
import { Container } from "../container.js";

export class SessionRepository {
  constructor(private readonly db: Client) {}
}

Container.register(SessionRepository, ["db"]);
