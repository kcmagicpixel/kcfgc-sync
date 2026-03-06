import type { Client } from "@libsql/client";
import { Container } from "../container.js";
import { Session } from "./session.model.js";

export class SessionRepository {
  constructor(private readonly db: Client) {}

  async findBySessionId(sessionId: string): Promise<Session | null> {
    const result = await this.db.execute({
      sql: `SELECT id, session_id as sessionId, user_id as userId, created_at as createdAt, deleted_at as deletedAt
            FROM session WHERE session_id = ? AND deleted_at IS NULL`,
      args: [sessionId],
    });
    if (result.rows.length === 0) return null;
    return Session.parse(result.rows[0]);
  }

  async create(sessionId: string, userId: number): Promise<void> {
    await this.db.execute({
      sql: `INSERT INTO session (session_id, user_id, created_at) VALUES (?, ?, ?)`,
      args: [sessionId, userId, Date.now()],
    });
  }

  async deleteBySessionId(sessionId: string): Promise<void> {
    await this.db.execute({
      sql: `UPDATE session SET deleted_at = ? WHERE session_id = ? AND deleted_at IS NULL`,
      args: [Date.now(), sessionId],
    });
  }
}

Container.register(SessionRepository, ["db"]);
