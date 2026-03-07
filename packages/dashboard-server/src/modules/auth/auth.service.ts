import { Container } from "#container";
import { verifyPassword } from "#utils/password.util.js";
import { UserService } from "../user/user.service.js";

export class AuthService {
  constructor(private readonly userService: UserService) {}

  async validateCredentials(
    username: string,
    password: string,
  ): Promise<number | null> {
    const user = await this.userService.findByUsername(username);
    if (!user) return null;

    const valid = await verifyPassword(password, user.passwordHash);
    if (!valid) return null;
    return user.id;
  }
}

Container.register(AuthService, [UserService]);
