import { describe, expect, it } from "vitest";
import { extractCookie, getBaseUrl, setupTestServer } from "../setup.js";

setupTestServer();

const ADMIN_CREDS = { username: "admin", password: "asrtein398202ntarseitm2390" };

async function login(creds: { username: string; password: string }) {
  const res = await fetch(`${getBaseUrl()}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(creds),
  });
  return extractCookie(res)!;
}

async function json<T = any>(res: Response): Promise<T> {
  return res.json() as Promise<T>;
}

describe("Users", () => {
  describe("GET /api/users", () => {
    it("returns 401 when unauthenticated", async () => {
      const res = await fetch(`${getBaseUrl()}/api/users`);
      expect(res.status).toBe(401);
    });

    it("returns user list when authenticated", async () => {
      const cookie = await login(ADMIN_CREDS);
      const res = await fetch(`${getBaseUrl()}/api/users`, {
        headers: { Cookie: cookie },
      });
      expect(res.status).toBe(200);
      const users = await json<any[]>(res);
      expect(users).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ username: "admin", role: "admin" }),
        ]),
      );
      // Should not include passwordHash
      for (const u of users) {
        expect(u).not.toHaveProperty("passwordHash");
      }
    });
  });

  describe("POST /api/users", () => {
    it("returns 400 for missing fields", async () => {
      const cookie = await login(ADMIN_CREDS);
      const res = await fetch(`${getBaseUrl()}/api/users`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Cookie: cookie },
        body: JSON.stringify({ username: "test" }),
      });
      expect(res.status).toBe(400);
    });

    it("creates a user as admin", async () => {
      const cookie = await login(ADMIN_CREDS);
      const res = await fetch(`${getBaseUrl()}/api/users`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Cookie: cookie },
        body: JSON.stringify({ username: "testuser", password: "testpass123" }),
      });
      expect(res.status).toBe(200);
      const body = await json(res);
      expect(body).toHaveProperty("id");
    });

    it("returns 409 for duplicate username", async () => {
      const cookie = await login(ADMIN_CREDS);
      const res = await fetch(`${getBaseUrl()}/api/users`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Cookie: cookie },
        body: JSON.stringify({ username: "testuser", password: "pass" }),
      });
      expect(res.status).toBe(409);
    });

    it("returns 403 for non-admin", async () => {
      const cookie = await login({ username: "testuser", password: "testpass123" });
      const res = await fetch(`${getBaseUrl()}/api/users`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Cookie: cookie },
        body: JSON.stringify({ username: "another", password: "pass" }),
      });
      expect(res.status).toBe(403);
    });
  });

  describe("PUT /api/users/:id/password", () => {
    it("non-admin can change own password", async () => {
      const cookie = await login({ username: "testuser", password: "testpass123" });
      // Get own user id
      const meRes = await fetch(`${getBaseUrl()}/api/auth/me`, {
        headers: { Cookie: cookie },
      });
      const { userId } = await json<{ userId: number }>(meRes);

      const res = await fetch(`${getBaseUrl()}/api/users/${userId}/password`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", Cookie: cookie },
        body: JSON.stringify({ password: "newpass456" }),
      });
      expect(res.status).toBe(200);

      // Old session should be invalidated
      const checkRes = await fetch(`${getBaseUrl()}/api/auth/me`, {
        headers: { Cookie: cookie },
      });
      expect(checkRes.status).toBe(401);

      // Can log in with new password
      const loginRes = await fetch(`${getBaseUrl()}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: "testuser", password: "newpass456" }),
      });
      expect(loginRes.status).toBe(200);
    });

    it("non-admin cannot change another user's password", async () => {
      const cookie = await login({ username: "testuser", password: "newpass456" });
      // Admin is user id 1
      const res = await fetch(`${getBaseUrl()}/api/users/1/password`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", Cookie: cookie },
        body: JSON.stringify({ password: "hacked" }),
      });
      expect(res.status).toBe(403);
    });

    it("admin can change another user's password", async () => {
      const cookie = await login(ADMIN_CREDS);
      // Get testuser id
      const usersRes = await fetch(`${getBaseUrl()}/api/users`, {
        headers: { Cookie: cookie },
      });
      const users = await json<any[]>(usersRes);
      const testUser = users.find((u) => u.username === "testuser");

      const res = await fetch(
        `${getBaseUrl()}/api/users/${testUser.id}/password`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json", Cookie: cookie },
          body: JSON.stringify({ password: "adminset789" }),
        },
      );
      expect(res.status).toBe(200);

      // Verify new password works
      const loginRes = await fetch(`${getBaseUrl()}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: "testuser", password: "adminset789" }),
      });
      expect(loginRes.status).toBe(200);
    });
  });

  describe("GET /api/users/:id/sessions", () => {
    it("returns sessions for a user", async () => {
      const cookie = await login(ADMIN_CREDS);
      const meRes = await fetch(`${getBaseUrl()}/api/auth/me`, {
        headers: { Cookie: cookie },
      });
      const { userId } = await json<{ userId: number }>(meRes);

      const res = await fetch(`${getBaseUrl()}/api/users/${userId}/sessions`, {
        headers: { Cookie: cookie },
      });
      expect(res.status).toBe(200);
      const sessions = await json<any[]>(res);
      expect(sessions.length).toBeGreaterThan(0);
      expect(sessions[0]).toHaveProperty("id");
      expect(sessions[0]).toHaveProperty("createdAt");
    });
  });

  describe("DELETE /api/users/:userId/sessions/:sessionId", () => {
    it("returns 401 when unauthenticated", async () => {
      const res = await fetch(`${getBaseUrl()}/api/users/1/sessions/1`, {
        method: "DELETE",
      });
      expect(res.status).toBe(401);
    });

    it("admin can revoke another user's session", async () => {
      const adminCookie = await login(ADMIN_CREDS);
      // Get testuser id
      const usersRes = await fetch(`${getBaseUrl()}/api/users`, {
        headers: { Cookie: adminCookie },
      });
      const users = await json<any[]>(usersRes);
      const testUser = users.find((u) => u.username === "testuser");

      // Log in as testuser to create a session
      await login({ username: "testuser", password: "adminset789" });

      // Get testuser's sessions
      const sessionsRes = await fetch(
        `${getBaseUrl()}/api/users/${testUser.id}/sessions`,
        { headers: { Cookie: adminCookie } },
      );
      const sessions = await json<any[]>(sessionsRes);
      expect(sessions.length).toBeGreaterThan(0);
      const targetSession = sessions[0];

      // Admin revokes it
      const res = await fetch(
        `${getBaseUrl()}/api/users/${testUser.id}/sessions/${targetSession.id}`,
        { method: "DELETE", headers: { Cookie: adminCookie } },
      );
      expect(res.status).toBe(200);

      // Session should be gone from the list
      const afterRes = await fetch(
        `${getBaseUrl()}/api/users/${testUser.id}/sessions`,
        { headers: { Cookie: adminCookie } },
      );
      const afterSessions = await json<any[]>(afterRes);
      expect(afterSessions.find((s) => s.id === targetSession.id)).toBeUndefined();
    });

    it("non-admin can revoke own session", async () => {
      const testCookie = await login({ username: "testuser", password: "adminset789" });
      const meRes = await fetch(`${getBaseUrl()}/api/auth/me`, {
        headers: { Cookie: testCookie },
      });
      const { userId } = await json<{ userId: number }>(meRes);

      // Get own sessions
      const sessionsRes = await fetch(
        `${getBaseUrl()}/api/users/${userId}/sessions`,
        { headers: { Cookie: testCookie } },
      );
      const sessions = await json<any[]>(sessionsRes);
      expect(sessions.length).toBeGreaterThan(0);
      const targetSession = sessions[0];

      // Revoke own session
      const res = await fetch(
        `${getBaseUrl()}/api/users/${userId}/sessions/${targetSession.id}`,
        { method: "DELETE", headers: { Cookie: testCookie } },
      );
      expect(res.status).toBe(200);
    });

    it("non-admin cannot revoke another user's session", async () => {
      const testCookie = await login({ username: "testuser", password: "adminset789" });
      // Admin is user id 1, get admin sessions
      const adminCookie = await login(ADMIN_CREDS);
      const sessionsRes = await fetch(`${getBaseUrl()}/api/users/1/sessions`, {
        headers: { Cookie: adminCookie },
      });
      const sessions = await json<any[]>(sessionsRes);
      expect(sessions.length).toBeGreaterThan(0);

      // Try to revoke admin's session as testuser
      const res = await fetch(
        `${getBaseUrl()}/api/users/1/sessions/${sessions[0].id}`,
        { method: "DELETE", headers: { Cookie: testCookie } },
      );
      expect(res.status).toBe(403);
    });

    it("returns 404 for non-existent session", async () => {
      const cookie = await login(ADMIN_CREDS);
      const res = await fetch(`${getBaseUrl()}/api/users/1/sessions/999999`, {
        method: "DELETE",
        headers: { Cookie: cookie },
      });
      expect(res.status).toBe(404);
    });

    it("returns 404 when session belongs to different user", async () => {
      const adminCookie = await login(ADMIN_CREDS);
      // Get admin's session
      const meRes = await fetch(`${getBaseUrl()}/api/auth/me`, {
        headers: { Cookie: adminCookie },
      });
      const { userId: adminId } = await json<{ userId: number }>(meRes);
      const sessionsRes = await fetch(
        `${getBaseUrl()}/api/users/${adminId}/sessions`,
        { headers: { Cookie: adminCookie } },
      );
      const sessions = await json<any[]>(sessionsRes);
      expect(sessions.length).toBeGreaterThan(0);

      // Get testuser id
      const usersRes = await fetch(`${getBaseUrl()}/api/users`, {
        headers: { Cookie: adminCookie },
      });
      const users = await json<any[]>(usersRes);
      const testUser = users.find((u) => u.username === "testuser");

      // Try to delete admin's session via testuser's URL
      const res = await fetch(
        `${getBaseUrl()}/api/users/${testUser.id}/sessions/${sessions[0].id}`,
        { method: "DELETE", headers: { Cookie: adminCookie } },
      );
      expect(res.status).toBe(404);
    });
  });

  describe("DELETE /api/users/:id", () => {
    it("returns 403 for non-admin", async () => {
      const cookie = await login({ username: "testuser", password: "adminset789" });
      const res = await fetch(`${getBaseUrl()}/api/users/1`, {
        method: "DELETE",
        headers: { Cookie: cookie },
      });
      expect(res.status).toBe(403);
    });

    it("returns 400 when admin tries to delete self", async () => {
      const cookie = await login(ADMIN_CREDS);
      const res = await fetch(`${getBaseUrl()}/api/users/1`, {
        method: "DELETE",
        headers: { Cookie: cookie },
      });
      expect(res.status).toBe(400);
    });

    it("admin can delete another user", async () => {
      const cookie = await login(ADMIN_CREDS);
      const usersRes = await fetch(`${getBaseUrl()}/api/users`, {
        headers: { Cookie: cookie },
      });
      const users = await json<any[]>(usersRes);
      const testUser = users.find((u) => u.username === "testuser");

      const res = await fetch(`${getBaseUrl()}/api/users/${testUser.id}`, {
        method: "DELETE",
        headers: { Cookie: cookie },
      });
      expect(res.status).toBe(200);

      // Verify user is gone
      const afterRes = await fetch(`${getBaseUrl()}/api/users`, {
        headers: { Cookie: cookie },
      });
      const afterUsers = await json<any[]>(afterRes);
      expect(afterUsers.find((u) => u.username === "testuser")).toBeUndefined();
    });
  });
});
