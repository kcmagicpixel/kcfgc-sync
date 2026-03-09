import type { Client } from "@libsql/client";
import { Container } from "#container";
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

  async deleteAllByUserId(userId: number): Promise<void> {
    await this.db.execute({
      sql: `UPDATE session SET deleted_at = ? WHERE user_id = ? AND deleted_at IS NULL`,
      args: [Date.now(), userId],
    });
  }

  async hardDeleteAllByUserId(userId: number): Promise<void> {
    await this.db.execute({
      sql: `DELETE FROM session WHERE user_id = ?`,
      args: [userId],
    });
  }

  async findById(id: number): Promise<Session | null> {
    const result = await this.db.execute({
      sql: `SELECT id, session_id as sessionId, user_id as userId, created_at as createdAt, deleted_at as deletedAt
            FROM session WHERE id = ? AND deleted_at IS NULL`,
      args: [id],
    });
    if (result.rows.length === 0) return null;
    return Session.parse(result.rows[0]);
  }

  async deleteById(id: number): Promise<boolean> {
    const result = await this.db.execute({
      sql: `UPDATE session SET deleted_at = ? WHERE id = ? AND deleted_at IS NULL`,
      args: [Date.now(), id],
    });
    return result.rowsAffected > 0;
  }

  async findAllByUserId(userId: number): Promise<Session[]> {
    const result = await this.db.execute({
      sql: `SELECT id, session_id as sessionId, user_id as userId, created_at as createdAt, deleted_at as deletedAt
            FROM session WHERE user_id = ? AND deleted_at IS NULL ORDER BY created_at DESC`,
      args: [userId],
    });
    return result.rows.map((r) => Session.parse(r));
  }
}

Container.register(SessionRepository, ["db"]);
