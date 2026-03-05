import pino from "pino";
import { Config } from "./config.js";
import { assertNever } from "./utils/assertNever.util.js";

export const Log = pino({
  level: Config.log.level,
  transport:
    Config.log.format === "pretty" ?
      {
        target: "pino-pretty",
        options: { colorize: true },
      }
    : Config.log.format === "json" ? undefined
    : assertNever(Config.log.format),
});
