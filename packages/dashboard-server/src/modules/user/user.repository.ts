import type { Client } from "@libsql/client";
import { Container } from "#container";
import { User } from "./user.model.js";

export class UserRepository {
  constructor(private readonly db: Client) {}

  async findByUsername(username: string): Promise<User | null> {
    const result = await this.db.execute({
      sql: `SELECT id, username, password_hash as passwordHash FROM user WHERE username = ?`,
      args: [username],
    });
    if (result.rows.length === 0) return null;
    return User.parse(result.rows[0]);
  }
}

Container.register(UserRepository, ["db"]);
