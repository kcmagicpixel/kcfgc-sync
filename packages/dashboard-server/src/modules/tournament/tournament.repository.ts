import type { Client } from "@libsql/client";
import { Container } from "#container";

export class TournamentRepository {
  constructor(private readonly db: Client) {}

  async upsert(key: string, data: unknown): Promise<void> {
    await this.db.execute({
      sql: `INSERT INTO tournament (key, data) VALUES (?, ?)
            ON CONFLICT(key) DO UPDATE SET data = excluded.data`,
      args: [key, JSON.stringify(data)],
    });
  }
}

Container.register(TournamentRepository, ["db"]);
