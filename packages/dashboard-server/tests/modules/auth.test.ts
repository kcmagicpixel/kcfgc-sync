import { describe, expect, it } from "vitest";
import { extractCookie, getBaseUrl, setupTestServer } from "../setup.js";

setupTestServer();

describe("Auth", () => {
  describe("POST /api/auth/login", () => {
    it("returns 400 when username or password is missing", async () => {
      const res = await fetch(`${getBaseUrl()}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: "admin" }),
      });
      expect(res.status).toBe(400);
      expect(await res.json()).toEqual({
        error: "Username and password required",
      });
    });

    it("returns 401 with invalid credentials", async () => {
      const res = await fetch(`${getBaseUrl()}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: "admin",
          password: "wrongpassword",
        }),
      });
      expect(res.status).toBe(401);
      expect(await res.json()).toEqual({ error: "Invalid credentials" });
    });

    it("returns 401 with non-existent username", async () => {
      const res = await fetch(`${getBaseUrl()}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: "nonexistent",
          password: "asrtein398202ntarseitm2390",
        }),
      });
      expect(res.status).toBe(401);
      expect(await res.json()).toEqual({ error: "Invalid credentials" });
    });

    it("returns 200 and sets session cookie with valid credentials", async () => {
      const res = await fetch(`${getBaseUrl()}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: "admin",
          password: "asrtein398202ntarseitm2390",
        }),
      });
      expect(res.status).toBe(200);
      expect(await res.json()).toEqual({ ok: true });

      const cookie = extractCookie(res);
      expect(cookie).toBeDefined();
      expect(cookie).toContain("userSession=");
    });
  });

  describe("POST /api/auth/logout", () => {
    it("destroys session and returns 200", async () => {
      const loginRes = await fetch(`${getBaseUrl()}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: "admin",
          password: "asrtein398202ntarseitm2390",
        }),
      });
      const cookie = extractCookie(loginRes);

      const logoutRes = await fetch(`${getBaseUrl()}/api/auth/logout`, {
        method: "POST",
        headers: { Cookie: cookie! },
      });
      expect(logoutRes.status).toBe(200);
      expect(await logoutRes.json()).toEqual({ ok: true });

      const meRes = await fetch(`${getBaseUrl()}/api/auth/me`, {
        headers: { Cookie: cookie! },
      });
      expect(meRes.status).toBe(401);
    });
  });

  describe("GET /api/auth/me", () => {
    it("returns 401 when not authenticated", async () => {
      const res = await fetch(`${getBaseUrl()}/api/auth/me`);
      expect(res.status).toBe(401);
      expect(await res.json()).toEqual({ error: "Unauthorized" });
    });

    it("returns 200 with userId when authenticated", async () => {
      const loginRes = await fetch(`${getBaseUrl()}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: "admin",
          password: "asrtein398202ntarseitm2390",
        }),
      });
      const cookie = extractCookie(loginRes);

      const res = await fetch(`${getBaseUrl()}/api/auth/me`, {
        headers: { Cookie: cookie! },
      });
      expect(res.status).toBe(200);
      expect(await res.json()).toEqual({
        userId: 1,
        username: "admin",
        role: "admin",
      });
    });
  });
});
