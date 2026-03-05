import { Container } from "../container.js";
import { SessionRepository } from "./session.repository.js";

export class SessionService {
  constructor(private readonly repo: SessionRepository) {}
}

Container.register(SessionService, [SessionRepository]);
