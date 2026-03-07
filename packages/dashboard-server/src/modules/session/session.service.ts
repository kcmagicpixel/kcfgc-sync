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

  async destroy(sessionId: string) {
    return this.repo.deleteBySessionId(sessionId);
  }
}

Container.register(SessionService, [SessionRepository]);
