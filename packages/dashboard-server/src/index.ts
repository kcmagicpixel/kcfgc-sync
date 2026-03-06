import { Config } from "./config.js";
import { initDatabase } from "./data/index.js";
import { initModules } from "./modules/index.js";
import { Log } from "./log.js";
import { initExpress } from "./app.js";

process.on("unhandledRejection", (err) => {
  Log.error(err, "Unhandled rejection");
});

const db = await initDatabase();
const app = await initExpress();

initModules(db, app);

Log.info(`app starting at http://localhost:${Config.server.port}`);
app.listen(Config.server.port);
