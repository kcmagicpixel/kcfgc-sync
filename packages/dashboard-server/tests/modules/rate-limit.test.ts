import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { extractCookie, getBaseUrl, setupTestServer } from "../setup.js";
import { Container } from "#modules/container.js";
import { RateLimitController } from "#modules/express/rate-limit.controller.js";

setupTestServer();

beforeAll(() => {
  const ctrl = Container.getInstance(RateLimitController);
  Object.assign(ctrl, { points: 1_000_000 });
});

afterAll(() => {
  const ctrl = Container.getInstance(RateLimitController);
  Object.assign(ctrl, { points: 0 });
});

async function login(): Promise<string> {
  const res = await fetch(`${getBaseUrl()}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      username: "admin",
      password: "asrtein398202ntarseitm2390",
    }),
  });
  return extractCookie(res)!;
}

beforeEach(() => {
  const ctrl = Container.getInstance(RateLimitController);
  ctrl.resetAll();
});

describe("Rate Limiting", () => {
  describe("unauthenticated requests", () => {
    it("returns 429 after exceeding login rate limit", async () => {
      // Login costs 100,000 points per attempt (100 base * 1000 unauthenticated multiplier).
      // Budget is 1,000,000 points, so 10 login attempts should exhaust it.
      const results: number[] = [];
      for (let i = 0; i < 12; i++) {
        const res = await fetch(`${getBaseUrl()}/api/auth/login`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            username: "nonexistent",
            password: "wrong",
          }),
        });
        results.push(res.status);
      }

      const successCount = results.filter((s) => s !== 429).length;
      const rateLimited = results.filter((s) => s === 429).length;
      expect(successCount).toBe(10);
      expect(rateLimited).toBe(2);
    });

    it("API requests cost 10x static resources", async () => {
      // API costs 10,000 points per request (10 base * 1000 multiplier).
      // Budget is 1,000,000 points, so 100 API requests should exhaust it.
      const results: number[] = [];
      for (let i = 0; i < 102; i++) {
        const res = await fetch(`${getBaseUrl()}/api/auth/me`);
        results.push(res.status);
      }

      const nonRateLimited = results.filter((s) => s !== 429).length;
      const rateLimited = results.filter((s) => s === 429).length;
      expect(nonRateLimited).toBe(100);
      expect(rateLimited).toBe(2);
    });
  });

  describe("authenticated requests", () => {
    it("authenticated users consume 1000x fewer points", async () => {
      const cookie = await login();

      // Authenticated API costs 10 points per request.
      // Budget is 1,000,000 points, so we can make 100,000 API requests.
      // We'll verify we can make well over the unauthenticated limit of 100.
      const results: number[] = [];
      for (let i = 0; i < 500; i++) {
        const res = await fetch(`${getBaseUrl()}/api/auth/me`, {
          headers: { Cookie: cookie },
        });
        results.push(res.status);
      }

      const rateLimited = results.filter((s) => s === 429).length;
      expect(rateLimited).toBe(0);
    });
  });

  describe("rate limit key isolation", () => {
    it("rate limits are per-key and do not affect other users", async () => {
      const cookie = await login();

      // Exhaust the unauthenticated budget with login attempts
      for (let i = 0; i < 11; i++) {
        await fetch(`${getBaseUrl()}/api/auth/login`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ username: "x", password: "x" }),
        });
      }

      // Verify unauthenticated is rate limited
      const unauthRes = await fetch(`${getBaseUrl()}/api/auth/me`);
      expect(unauthRes.status).toBe(429);

      // Authenticated user should still be fine (different key)
      const res = await fetch(`${getBaseUrl()}/api/auth/me`, {
        headers: { Cookie: cookie },
      });
      expect(res.status).toBe(200);
    });
  });
});
