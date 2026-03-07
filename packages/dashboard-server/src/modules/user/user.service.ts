import { Container } from "#container";
import { UserRepository } from "./user.repository.js";

export class UserService {
  constructor(private readonly repo: UserRepository) {}

  async findByUsername(username: string) {
    return this.repo.findByUsername(username);
  }
}

Container.register(UserService, [UserRepository]);
