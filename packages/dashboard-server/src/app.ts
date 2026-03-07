import express from "express";

export async function initExpress() {
  const app = express();
  app.disable("x-powered-by");
  app.set("trust proxy", 1);
  app.use(express.json({ limit: "2mb" }));

  return app;
}
