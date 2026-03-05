import type { Application } from "express";

export interface Controller {
  register(app: Application): Promise<void>;
}
