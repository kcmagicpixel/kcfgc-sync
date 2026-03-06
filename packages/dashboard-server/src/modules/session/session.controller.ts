import { Config } from "#config";
import type { Application, RequestHandler } from "express";
import session, { Store } from "express-session";
import type { Controller } from "../base.controller.js";
import { Container } from "../container.js";
import { SessionService } from "./session.service.js";

declare module "express-session" {
  interface SessionData {
    userId?: number;
  }
}

class SessionStore extends Store {
  constructor(private readonly service: SessionService) {
    super();
  }

  get(
    sid: string,
    callback: (err: any, session?: session.SessionData | null) => void
  ): void {
    this.service
      .findBySessionId(sid)
      .then((s) => {
        if (!s) return callback(null, null);
        callback(null, { cookie: {} as any, userId: s.userId });
      })
      .catch((err) => callback(err));
  }

  set(
    sid: string,
    sessionData: session.SessionData,
    callback?: (err?: any) => void
  ): void {
    if (!sessionData.userId) {
      callback?.();
      return;
    }
    this.service
      .destroy(sid)
      .then(() => this.service.create(sid, sessionData.userId!))
      .then(() => callback?.())
      .catch((err) => callback?.(err));
  }

  destroy(sid: string, callback?: (err?: any) => void): void {
    this.service
      .destroy(sid)
      .then(() => callback?.())
      .catch((err) => callback?.(err));
  }
}

export class SessionController implements Controller {
  constructor(
    private readonly service: SessionService,
    private readonly store: SessionStore
  ) {}

  async register(app: Application) {
    app.use(
      session({
        name: "userSession",
        secret: Config.server.sessionSecret,
        resave: false,
        saveUninitialized: false,
        cookie: {
          secure: Config.server.secure,
          sameSite: "lax",
          maxAge: 1209600000, // 2 weeks
        },
        store: this.store,
      })
    );
  }

  public readonly isAuthenticated: RequestHandler = (req, res, next) => {
    if (req.session?.userId) {
      next();
    } else {
      res.status(401).json({ error: "Unauthorized" });
    }
  };
}

Container.register(SessionStore, [SessionService]);
Container.register(SessionController, [SessionService, SessionStore]);
