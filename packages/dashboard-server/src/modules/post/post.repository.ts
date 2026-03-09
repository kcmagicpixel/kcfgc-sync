import type { Client } from "@libsql/client";
import { Container } from "#container";

export interface PostRow {
  id: number;
  uniqueKey: string;
  provider: string;
  url: string;
  createdAt: number;
}

export class PostRepository {
  constructor(private readonly db: Client) {}

  async insert(
    uniqueKey: string,
    provider: string,
    url: string
  ): Promise<void> {
    await this.db.execute({
      sql: `INSERT INTO post (unique_key, provider, url, created_at) VALUES (?, ?, ?, ?)`,
      args: [uniqueKey, provider, url, Date.now()],
    });
  }

  async findByUniqueKeys(keys: string[]): Promise<PostRow[]> {
    if (keys.length === 0) return [];
    const placeholders = keys.map(() => "?").join(", ");
    const result = await this.db.execute({
      sql: `SELECT id, unique_key as uniqueKey, provider, url, created_at as createdAt FROM post WHERE unique_key IN (${placeholders})`,
      args: keys,
    });
    return result.rows as unknown as PostRow[];
  }
  async deleteByUniqueKey(uniqueKey: string): Promise<void> {
    await this.db.execute({
      sql: `DELETE FROM post WHERE unique_key = ?`,
      args: [uniqueKey],
    });
  }
}

Container.register(PostRepository, ["db"]);
