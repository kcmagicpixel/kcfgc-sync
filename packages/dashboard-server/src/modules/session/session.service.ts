import { Container } from "#container";
import { SessionRepository } from "./session.repository.js";

export class SessionService {
  constructor(private readonly repo: SessionRepository) {}

  async findBySessionId(sessionId: string) {
    return this.repo.findBySessionId(sessionId);
  }

  async create(sessionId: string, userId: number) {
    return this.repo.create(sessionId, userId);
  }

  async findById(id: number) {
    return this.repo.findById(id);
  }

  async destroy(sessionId: string) {
    return this.repo.deleteBySessionId(sessionId);
  }

  async destroyById(id: number) {
    return this.repo.deleteById(id);
  }

  async destroyAllByUserId(userId: number) {
    return this.repo.deleteAllByUserId(userId);
  }

  async findAllByUserId(userId: number) {
    return this.repo.findAllByUserId(userId);
  }

  async hardDeleteAllByUserId(userId: number) {
    return this.repo.hardDeleteAllByUserId(userId);
  }
}

Container.register(SessionService, [SessionRepository]);
