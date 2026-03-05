import { z } from "zod";

const ConfigSchema = z.object({
  database: z.object({
    path: z.string().startsWith("file:"),
  }),
  log: z.object({
    format: z.enum(["pretty", "json"]),
    level: z.string(),
  }),
  server: z.object({
    port: z.number().positive(),
    sessionSecret: z.string(),
  }),
  seed: z.object({
    // user/pass
  }),
  startgg: z.object({
    apiKey: z.string(),
  }),
});

const ConfigFromEnv = z.preprocess((env: Record<any, any>) => {
  return {
    database: {
      path: env.DATABASE_PATH,
    },
    log: {
      format: env.LOG_FORMAT,
      level: env.LOG_LEVEL,
    },
    server: {
      port: Number(env.DASHBOARD_PORT),
      sessionSecret: env.DASHBOARD_SESSION_SECRET,
    },
    seed: {},
    startgg: {
      apiKey: env.START_GG_API_KEY,
    },
  } satisfies Config;
}, ConfigSchema);

export const Config = ConfigFromEnv.parse(process.env);
export type Config = z.infer<typeof ConfigSchema>;
