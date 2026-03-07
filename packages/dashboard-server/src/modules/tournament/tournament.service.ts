import { Container } from "#container";
import { TournamentRepository } from "./tournament.repository.js";

export class TournamentService {
  constructor(private readonly repo: TournamentRepository) {}

  async listAll() {
    return this.repo.listAll();
  }
}

Container.register(TournamentService, [TournamentRepository]);
