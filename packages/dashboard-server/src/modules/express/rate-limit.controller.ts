import { Config } from "#config";
import type { Application, RequestHandler } from "express";
import { RateLimiterMemory } from "rate-limiter-flexible";
import type { Controller } from "../controller.model.js";
import { Container } from "#container";

const UNAUTHENTICATED_MULTIPLIER = 1000;

const COST_STATIC = 1;
const COST_API = COST_STATIC * 10;
const COST_LOGIN = COST_STATIC * 100;

function getBaseCost(path: string): number {
  if (path === "/api/auth/login") return COST_LOGIN;
  if (path.startsWith("/api/")) return COST_API;
  return COST_STATIC;
}

export class RateLimitController implements Controller {
  private readonly points = Config.server.rateLimitPoints;
  private readonly durationSeconds = 600; // 10 minutes

  private limiter = new RateLimiterMemory({
    points: this.points,
    duration: this.durationSeconds,
  });

  async register(app: Application) {
    app.use(this.middleware);
  }

  resetAll() {
    this.limiter = new RateLimiterMemory({
      points: this.points,
      duration: this.durationSeconds,
    });
  }

  public readonly middleware: RequestHandler = async (req, res, next) => {
    if (this.points === 0) {
      // rate limiting disabled
      return next();
    }

    const userId = req.session?.userId;
    const key = userId != null ? `user:${userId}` : (req.ip ?? "unknown");

    const baseCost = getBaseCost(req.path);
    const cost =
      userId != null ? baseCost : baseCost * UNAUTHENTICATED_MULTIPLIER;

    try {
      await this.limiter.consume(key, cost);
      next();
    } catch {
      res.status(429).json({ error: "Too many requests" });
    }
  };
}

Container.register(RateLimitController, []);
