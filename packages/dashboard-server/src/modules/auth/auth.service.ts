import { scrypt, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";
import { Container } from "../container.js";
import { UserService } from "../user/user.service.js";

const scryptAsync = promisify(scrypt);

export class AuthService {
  constructor(private readonly userService: UserService) {}

  async validateCredentials(
    username: string,
    password: string
  ): Promise<number | null> {
    const user = await this.userService.findByUsername(username);
    if (!user) return null;

    const [salt, storedHash] = user.passwordHash.split(":");
    const derivedKey = (await scryptAsync(password, salt, 64)) as Buffer;
    const storedBuffer = Buffer.from(storedHash, "hex");

    if (!timingSafeEqual(derivedKey, storedBuffer)) return null;
    return user.id;
  }
}

Container.register(AuthService, [UserService]);
