import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    setupFiles: ["dotenv/config"],
    env: {
      DASHBOARD_PORT: "0",
      DATABASE_PATH: ":memory:",
      LOG_LEVEL: "silent",
    },
  },
});
