import type { Client } from "@libsql/client";
import { Container } from "#container";
import { User } from "./user.model.js";

export class UserRepository {
  constructor(private readonly db: Client) {}

  async findByUsername(username: string): Promise<User | null> {
    const result = await this.db.execute({
      sql: `SELECT id, username, password_hash as passwordHash, role FROM user WHERE username = ?`,
      args: [username],
    });
    if (result.rows.length === 0) return null;
    return User.parse(result.rows[0]);
  }

  async findById(id: number): Promise<User | null> {
    const result = await this.db.execute({
      sql: `SELECT id, username, password_hash as passwordHash, role FROM user WHERE id = ?`,
      args: [id],
    });
    if (result.rows.length === 0) return null;
    return User.parse(result.rows[0]);
  }

  async findAll(): Promise<Omit<User, "passwordHash">[]> {
    const result = await this.db.execute(
      `SELECT id, username, role FROM user ORDER BY id`
    );
    return result.rows.map((row) => ({
      id: row["id"] as number,
      username: row["username"] as string,
      role: row["role"] as User["role"],
    }));
  }

  async create(
    username: string,
    passwordHash: string,
    role: string = "user"
  ): Promise<number> {
    const result = await this.db.execute({
      sql: `INSERT INTO user (username, password_hash, role) VALUES (?, ?, ?)`,
      args: [username, passwordHash, role],
    });
    return Number(result.lastInsertRowid);
  }

  async updatePasswordHash(id: number, passwordHash: string): Promise<void> {
    await this.db.execute({
      sql: `UPDATE user SET password_hash = ? WHERE id = ?`,
      args: [passwordHash, id],
    });
  }

  async deleteById(id: number): Promise<void> {
    await this.db.execute({
      sql: `DELETE FROM user WHERE id = ?`,
      args: [id],
    });
  }
}

Container.register(UserRepository, ["db"]);
