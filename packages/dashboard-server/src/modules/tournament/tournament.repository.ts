import type { Client } from "@libsql/client";
import { Container } from "#container";

export interface TournamentRow {
  key: string;
  data: unknown;
  updatedAt: number | null;
}

export class TournamentRepository {
  constructor(private readonly db: Client) {}

  async upsert(key: string, data: unknown): Promise<void> {
    const now = Date.now();
    await this.db.execute({
      sql: `INSERT INTO tournament (key, data, updated_at) VALUES (?, ?, ?)
            ON CONFLICT(key) DO UPDATE SET data = excluded.data, updated_at = excluded.updated_at`,
      args: [key, JSON.stringify(data), now],
    });
  }

  async listAll(): Promise<TournamentRow[]> {
    const result = await this.db.execute(
      `SELECT key, data, updated_at as updatedAt FROM tournament ORDER BY key`,
    );
    return result.rows.map((row) => ({
      key: row["key"] as string,
      data: JSON.parse(row["data"] as string) as unknown,
      updatedAt: row["updatedAt"] as number | null,
    }));
  }
}

Container.register(TournamentRepository, ["db"]);
