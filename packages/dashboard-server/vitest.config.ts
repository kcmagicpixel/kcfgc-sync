import { defineConfig } from "vitest/config";
import tsconfigPaths from "vite-tsconfig-paths";

export default defineConfig({
  plugins: [tsconfigPaths({ projects: ["tsconfig.test.json"] })],
  test: {
    setupFiles: ["dotenv/config"],
    env: {
      BSKY_APP_PASSWORD: "secret",
      BSKY_USERNAME: "secret",
      DASHBOARD_PORT: "0",
      DASHBOARD_LIMIT_POINT: "0",
      DATABASE_PATH: ":memory:",
      LOG_LEVEL: "silent",
      START_GG_API_KEY: "secret",
      TWITTER_ACCESS_TOKEN: "secret",
      TWITTER_ACCESS_SECRET: "secret",
      TWITTER_APP_KEY: "secret",
      TWITTER_APP_SECRET: "secret",
    },
  },
});
