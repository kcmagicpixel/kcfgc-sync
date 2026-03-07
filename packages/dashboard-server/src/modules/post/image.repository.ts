import type { Client } from "@libsql/client";
import { Container } from "#container";

export interface ImageRow {
  id: number;
  data: ArrayBuffer;
  mimeType: string;
}

export class ImageRepository {
  constructor(private readonly db: Client) {}

  async insert(data: Buffer, mimeType: string): Promise<number> {
    const result = await this.db.execute({
      sql: `INSERT INTO image (data, mime_type, created_at) VALUES (?, ?, ?)`,
      args: [data, mimeType, Date.now()],
    });
    return Number(result.lastInsertRowid);
  }

  async findAll(): Promise<Omit<ImageRow, "data">[]> {
    const result = await this.db.execute(
      `SELECT id, mime_type as mimeType, created_at as createdAt FROM image ORDER BY created_at DESC`,
    );
    return result.rows as unknown as Omit<ImageRow, "data">[];
  }

  async findByIds(ids: number[]): Promise<ImageRow[]> {
    if (ids.length === 0) return [];
    const placeholders = ids.map(() => "?").join(", ");
    const result = await this.db.execute({
      sql: `SELECT id, data, mime_type as mimeType FROM image WHERE id IN (${placeholders})`,
      args: ids,
    });
    return result.rows as unknown as ImageRow[];
  }

  async findById(id: number): Promise<ImageRow | null> {
    const result = await this.db.execute({
      sql: `SELECT id, data, mime_type as mimeType FROM image WHERE id = ?`,
      args: [id],
    });
    if (result.rows.length === 0) return null;
    return result.rows[0] as unknown as ImageRow;
  }

  async deleteByIds(ids: number[]): Promise<void> {
    if (ids.length === 0) return;
    const placeholders = ids.map(() => "?").join(", ");
    await this.db.execute({
      sql: `DELETE FROM image WHERE id IN (${placeholders})`,
      args: ids,
    });
  }
}

Container.register(ImageRepository, ["db"]);
