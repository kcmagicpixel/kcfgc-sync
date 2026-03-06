import { defineConfig } from "vitest/config";
import tsconfigPaths from "vite-tsconfig-paths";

export default defineConfig({
  plugins: [tsconfigPaths({ projects: ["tsconfig.test.json"] })],
  test: {
    setupFiles: ["dotenv/config"],
    env: {
      DASHBOARD_PORT: "0",
      DASHBOARD_LIMIT_POINT: "0",
      DATABASE_PATH: ":memory:",
      LOG_LEVEL: "silent",
    },
  },
});
