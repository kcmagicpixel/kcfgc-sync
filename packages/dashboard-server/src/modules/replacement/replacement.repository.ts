import type { Client } from "@libsql/client";
import { Container } from "#container";

export interface ReplacementRow {
  id: number;
  input: string;
  output: Record<string, string>;
  createdAt: number;
  updatedAt: number;
}

const COLUMNS = `id, input, output, created_at as createdAt, updated_at as updatedAt`;

export class ReplacementRepository {
  constructor(private readonly db: Client) {}

  async findAll(): Promise<ReplacementRow[]> {
    const result = await this.db.execute(
      `SELECT ${COLUMNS} FROM replacement ORDER BY created_at DESC`,
    );
    return result.rows.map((row) => ({
      ...(row as unknown as Omit<ReplacementRow, "output">),
      output: JSON.parse(row.output as string) as Record<string, string>,
    }));
  }

  async findById(id: number): Promise<ReplacementRow | null> {
    const result = await this.db.execute({
      sql: `SELECT ${COLUMNS} FROM replacement WHERE id = ?`,
      args: [id],
    });
    if (result.rows.length === 0) return null;
    const row = result.rows[0];
    return {
      ...(row as unknown as Omit<ReplacementRow, "output">),
      output: JSON.parse(row.output as string) as Record<string, string>,
    };
  }

  async insert(
    input: string,
    output: Record<string, string>,
  ): Promise<number> {
    const now = Date.now();
    const result = await this.db.execute({
      sql: `INSERT INTO replacement (input, output, created_at, updated_at) VALUES (?, ?, ?, ?)`,
      args: [input, JSON.stringify(output), now, now],
    });
    return Number(result.lastInsertRowid);
  }

  async update(
    id: number,
    input: string,
    output: Record<string, string>,
  ): Promise<void> {
    await this.db.execute({
      sql: `UPDATE replacement SET input = ?, output = ?, updated_at = ? WHERE id = ?`,
      args: [input, JSON.stringify(output), Date.now(), id],
    });
  }

  async deleteById(id: number): Promise<void> {
    await this.db.execute({
      sql: `DELETE FROM replacement WHERE id = ?`,
      args: [id],
    });
  }
}

Container.register(ReplacementRepository, ["db"]);
