import type { Application } from "express";
import type { Controller } from "../controller.model.js";
import { Container } from "#container";
import { AuthService } from "./auth.service.js";
import { SessionController } from "../session/session.controller.js";
import { UserService } from "../user/user.service.js";

export class AuthController implements Controller {
  constructor(
    private readonly authService: AuthService,
    private readonly sessionController: SessionController,
    private readonly userService: UserService
  ) {}

  async register(app: Application) {
    app.post("/api/auth/login", async (req, res) => {
      const { username, password } = req.body;
      if (!username || !password) {
        res.status(400).json({ error: "Username and password required" });
        return;
      }

      const userId = await this.authService.validateCredentials(
        username,
        password
      );
      if (userId == null) {
        res.status(401).json({ error: "Invalid credentials" });
        return;
      }

      req.session.userId = userId;
      req.session.save((err) => {
        if (err) {
          res.status(500).json({ error: "Session error" });
          return;
        }
        res.json({ ok: true });
      });
    });

    app.post("/api/auth/logout", (req, res) => {
      req.session.destroy((err) => {
        if (err) {
          res.status(500).json({ error: "Logout failed" });
          return;
        }
        res.clearCookie("userSession");
        res.json({ ok: true });
      });
    });

    app.get(
      "/api/auth/me",
      this.sessionController.isAuthenticated,
      async (req, res) => {
        const user = await this.userService.findById(req.session.userId!);
        if (!user) {
          res.status(401).json({ error: "Unauthorized" });
          return;
        }
        res.json({ userId: user.id, username: user.username, role: user.role });
      }
    );
  }
}

Container.register(AuthController, [
  AuthService,
  SessionController,
  UserService,
]);
