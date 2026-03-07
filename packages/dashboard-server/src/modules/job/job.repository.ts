import type { Client } from "@libsql/client";
import { Container } from "#container";
import { Job, type JobState } from "./job.model.js";

const JOB_COLUMNS = `id, type, state, run_after as runAfter, schedule, payload, output, created_at as createdAt, updated_at as updatedAt`;

export class JobRepository {
  constructor(private readonly db: Client) {}

  async findNextPending(): Promise<Job | null> {
    const result = await this.db.execute({
      sql: `SELECT ${JOB_COLUMNS} FROM job WHERE state = 'pending' AND run_after <= ? ORDER BY run_after LIMIT 1`,
      args: [Date.now()],
    });
    if (result.rows.length === 0) return null;
    return Job.parse(result.rows[0]);
  }

  async claimJob(id: number): Promise<boolean> {
    const result = await this.db.execute({
      sql: `UPDATE job SET state = 'running', updated_at = ? WHERE id = ? AND state = 'pending'`,
      args: [Date.now(), id],
    });
    return result.rowsAffected > 0;
  }

  async completeJob(id: number, output?: unknown): Promise<void> {
    await this.db.execute({
      sql: `UPDATE job SET state = 'completed', output = ?, updated_at = ? WHERE id = ?`,
      args: [output != null ? JSON.stringify(output) : null, Date.now(), id],
    });
  }

  async failJob(id: number, error: unknown): Promise<void> {
    const output =
      error instanceof Error
        ? { message: error.message, stack: error.stack }
        : { message: String(error) };
    await this.db.execute({
      sql: `UPDATE job SET state = 'failed', output = ?, updated_at = ? WHERE id = ?`,
      args: [JSON.stringify(output), Date.now(), id],
    });
  }

  async resetStaleJobs(timeoutMs: number): Promise<number> {
    const result = await this.db.execute({
      sql: `UPDATE job SET state = 'pending', updated_at = ? WHERE state = 'running' AND updated_at < ?`,
      args: [Date.now(), Date.now() - timeoutMs],
    });
    return result.rowsAffected;
  }

  async createJob(
    type: string,
    payload: unknown,
    runAfter: number = Date.now(),
    schedule: string | null = null,
  ): Promise<number> {
    const now = Date.now();
    const result = await this.db.execute({
      sql: `INSERT INTO job (type, state, run_after, schedule, payload, created_at, updated_at) VALUES (?, 'pending', ?, ?, ?, ?, ?)`,
      args: [type, runAfter, schedule, JSON.stringify(payload), now, now],
    });
    return Number(result.lastInsertRowid);
  }

  async findByType(type: string, states?: JobState[]): Promise<Job[]> {
    if (states && states.length > 0) {
      const placeholders = states.map(() => "?").join(", ");
      const result = await this.db.execute({
        sql: `SELECT ${JOB_COLUMNS} FROM job WHERE type = ? AND state IN (${placeholders}) ORDER BY created_at DESC`,
        args: [type, ...states],
      });
      return result.rows.map((row) => Job.parse(row));
    }
    const result = await this.db.execute({
      sql: `SELECT ${JOB_COLUMNS} FROM job WHERE type = ? ORDER BY created_at DESC`,
      args: [type],
    });
    return result.rows.map((row) => Job.parse(row));
  }

  async listJobs(): Promise<Job[]> {
    const result = await this.db.execute(
      `SELECT ${JOB_COLUMNS} FROM job ORDER BY created_at DESC`,
    );
    return result.rows.map((row) => Job.parse(row));
  }
}

Container.register(JobRepository, ["db"]);
