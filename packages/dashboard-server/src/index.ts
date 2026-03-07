import { Config } from "./config.js";
import { initDatabase } from "./data/index.js";
import { initControllers } from "./modules/controller.js";
import { initWorkers } from "./modules/worker.js";
import { Log } from "./log.js";
import { initExpress } from "./app.js";
import { Container } from "#container";

process.on("unhandledRejection", (err) => {
  Log.error(err, "Unhandled rejection");
});

const db = await initDatabase();
const app = await initExpress();
Container.registerSingleton("db", db);
initControllers(app);

const engine = initWorkers();
engine.start();

process.on("SIGTERM", async () => {
  await engine.stop();
  process.exit(0);
});

Log.info(`app starting at http://localhost:${Config.server.port}`);
app.listen(Config.server.port);
