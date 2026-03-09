import { Container } from "#container";
import { hashPassword } from "#utils/password.util.js";
import { SessionService } from "../session/session.service.js";
import { UserRepository } from "./user.repository.js";

export class UserService {
  constructor(
    private readonly repo: UserRepository,
    private readonly sessionService: SessionService,
  ) {}

  async findByUsername(username: string) {
    return this.repo.findByUsername(username);
  }

  async findById(id: number) {
    return this.repo.findById(id);
  }

  async findAll() {
    return this.repo.findAll();
  }

  async create(username: string, password: string): Promise<number> {
    const hash = await hashPassword(password);
    return this.repo.create(username, hash, "user");
  }

  async updatePassword(userId: number, newPassword: string): Promise<void> {
    const hash = await hashPassword(newPassword);
    await this.repo.updatePasswordHash(userId, hash);
    await this.sessionService.destroyAllByUserId(userId);
  }

  async deleteById(id: number): Promise<void> {
    await this.sessionService.hardDeleteAllByUserId(id);
    await this.repo.deleteById(id);
  }

  async findSessionsByUserId(userId: number) {
    const sessions = await this.sessionService.findAllByUserId(userId);
    return sessions.map((s) => ({ id: s.id, createdAt: s.createdAt }));
  }

  async findSessionById(sessionId: number) {
    return this.sessionService.findById(sessionId);
  }

  async deleteSession(sessionId: number) {
    return this.sessionService.destroyById(sessionId);
  }
}

Container.register(UserService, [UserRepository, SessionService]);
