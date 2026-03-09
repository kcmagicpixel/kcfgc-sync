import type { Application, Request, Response } from "express";
import type { Controller } from "../controller.model.js";
import { Container } from "#container";
import { SessionController } from "../session/session.controller.js";
import { UserService } from "./user.service.js";

export class UserController implements Controller {
  constructor(
    private readonly session: SessionController,
    private readonly userService: UserService
  ) {}

  private async requireAdmin(req: Request, res: Response): Promise<boolean> {
    const user = await this.userService.findById(req.session.userId!);
    if (!user || user.role !== "admin") {
      res.status(403).json({ error: "Forbidden" });
      return false;
    }
    return true;
  }

  async register(app: Application) {
    app.get("/api/users", this.session.isAuthenticated, async (_req, res) => {
      const users = await this.userService.findAll();
      res.json(users);
    });

    app.post("/api/users", this.session.isAuthenticated, async (req, res) => {
      if (!(await this.requireAdmin(req, res))) return;

      const { username, password } = req.body;
      if (!username || !password) {
        res.status(400).json({ error: "Username and password required" });
        return;
      }

      try {
        const id = await this.userService.create(username, password);
        res.json({ id });
      } catch (err: any) {
        if (
          err.code === "SQLITE_CONSTRAINT_UNIQUE" ||
          err.message?.includes("UNIQUE constraint failed")
        ) {
          res.status(409).json({ error: "Username already exists" });
          return;
        }
        throw err;
      }
    });

    app.put(
      "/api/users/:id/password",
      this.session.isAuthenticated,
      async (req, res) => {
        const targetId = Number(req.params.id);
        const currentUserId = req.session.userId!;

        if (targetId !== currentUserId) {
          if (!(await this.requireAdmin(req, res))) return;
        }

        const { password } = req.body;
        if (!password) {
          res.status(400).json({ error: "Password required" });
          return;
        }

        await this.userService.updatePassword(targetId, password);
        res.json({ ok: true });
      }
    );

    app.delete(
      "/api/users/:id",
      this.session.isAuthenticated,
      async (req, res) => {
        if (!(await this.requireAdmin(req, res))) return;

        const targetId = Number(req.params.id);
        if (targetId === req.session.userId!) {
          res.status(400).json({ error: "Cannot delete yourself" });
          return;
        }

        await this.userService.deleteById(targetId);
        res.json({ ok: true });
      }
    );

    app.get(
      "/api/users/:id/sessions",
      this.session.isAuthenticated,
      async (req, res) => {
        const sessions = await this.userService.findSessionsByUserId(
          Number(req.params.id)
        );
        res.json(sessions);
      }
    );

    app.delete(
      "/api/users/:userId/sessions/:sessionId",
      this.session.isAuthenticated,
      async (req, res) => {
        const targetUserId = Number(req.params.userId);
        const sessionId = Number(req.params.sessionId);
        const currentUserId = req.session.userId!;

        if (targetUserId !== currentUserId) {
          if (!(await this.requireAdmin(req, res))) return;
        }

        const session = await this.userService.findSessionById(sessionId);
        if (!session || session.userId !== targetUserId) {
          res.status(404).json({ error: "Session not found" });
          return;
        }

        await this.userService.deleteSession(sessionId);
        res.json({ ok: true });
      }
    );
  }
}

Container.register(UserController, [SessionController, UserService]);
