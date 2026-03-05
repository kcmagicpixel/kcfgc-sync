import type { Application } from "express";
import session, { Store } from "express-session";
import type { Controller } from "../base.controller.js";
import { Container } from "../container.js";
import { Config } from "../../config.js";
import { SessionService } from "./session.service.js";

class SessionStore extends Store {
  constructor(private readonly service: SessionService) {
    super();
  }

  get(
    sid: string,
    callback: (err: any, session?: session.SessionData | null) => void
  ): void {
    throw new Error("Method not implemented.");
  }

  set(
    sid: string,
    session: session.SessionData,
    callback?: (err?: any) => void
  ): void {
    throw new Error("Method not implemented.");
  }

  destroy(sid: string, callback?: (err?: any) => void): void {
    throw new Error("Method not implemented.");
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
        secret: Config.server.sessionSecret,
        saveUninitialized: false,
        cookie: {
          secure: true,
          sameSite: "lax",
          maxAge: 60000,
        },
        store: this.store,
      })
    );
  }
}

Container.register(SessionStore, [SessionService]);
Container.register(SessionController, [SessionService, SessionStore]);
