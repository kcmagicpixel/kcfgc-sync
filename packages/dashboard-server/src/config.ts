import { z } from "zod";

const ConfigSchema = z.object({
  database: z.object({
    path: z.union([z.string().startsWith("file:"), z.literal(":memory:")]),
  }),
  log: z.object({
    format: z.enum(["pretty", "json"]),
    level: z.string(),
  }),
  server: z.object({
    port: z.number().nonnegative(),
    rateLimitPoints: z.int(),
    sessionSecret: z.string(),
    secure: z.boolean(),
  }),
  seed: z.object({
    user: z.string().min(1),
    pass: z.string().min(1),
  }),
  worker: z.object({
    pollIntervalMs: z.number().nonnegative(),
    staleTimeoutMs: z.number().nonnegative(),
  }),
  startgg: z.object({
    apiKey: z.string(),
  }),
  bluesky: z.object({
    identifier: z.string().min(1),
    password: z.string().min(1),
  }).nullable(),
  twitter: z.object({
    appKey: z.string().min(1),
    appSecret: z.string().min(1),
    accessToken: z.string().min(1),
    accessSecret: z.string().min(1),
  }).nullable(),
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
      rateLimitPoints: Number(env.DASHBOARD_LIMIT_POINT),
      sessionSecret: env.DASHBOARD_SESSION_SECRET,
      secure: env.DASHBOARD_SECURE === "true",
    },
    seed: {
      user: env.SEED_USER,
      pass: env.SEED_PASS,
    },
    worker: {
      pollIntervalMs: Number(env.WORKER_POLL_INTERVAL_MS),
      staleTimeoutMs: Number(env.WORKER_STALE_TIMEOUT_MS),
    },
    startgg: {
      apiKey: env.START_GG_API_KEY,
    },
    bluesky: env.BSKY_USERNAME && env.BSKY_APP_PASSWORD
      ? { identifier: env.BSKY_USERNAME, password: env.BSKY_APP_PASSWORD }
      : null,
    twitter: env.TWITTER_APP_KEY && env.TWITTER_APP_SECRET && env.TWITTER_ACCESS_TOKEN && env.TWITTER_ACCESS_SECRET
      ? { appKey: env.TWITTER_APP_KEY, appSecret: env.TWITTER_APP_SECRET, accessToken: env.TWITTER_ACCESS_TOKEN, accessSecret: env.TWITTER_ACCESS_SECRET }
      : null,
  } satisfies Config;
}, ConfigSchema);

export const Config = ConfigFromEnv.parse(process.env);
export type Config = z.infer<typeof ConfigSchema>;
