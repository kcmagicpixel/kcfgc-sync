import { Config } from "./config.js";
import { initDatabase } from "./data/index.js";
import express from "express";
import { initModules } from "./modules/index.js";
import { Log } from "./log.js";

process.on("unhandledRejection", (err) => {
  Log.error(err, "Unhandled rejection");
});

const db = await initDatabase();
const app = express();
app.set("trust proxy", 1);

initModules(db, app);

Log.info(`app starting at http://localhost:${Config.server.port}`);
app.listen(Config.server.port);
