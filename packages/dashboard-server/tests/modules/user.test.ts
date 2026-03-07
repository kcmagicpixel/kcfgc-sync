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
      const users = await res.json();
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
      const body = await res.json();
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
      const { userId } = await meRes.json();

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
      const users = await usersRes.json();
      const testUser = users.find((u: any) => u.username === "testuser");

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
      const { userId } = await meRes.json();

      const res = await fetch(`${getBaseUrl()}/api/users/${userId}/sessions`, {
        headers: { Cookie: cookie },
      });
      expect(res.status).toBe(200);
      const sessions = await res.json();
      expect(sessions.length).toBeGreaterThan(0);
      expect(sessions[0]).toHaveProperty("id");
      expect(sessions[0]).toHaveProperty("createdAt");
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
      const users = await usersRes.json();
      const testUser = users.find((u: any) => u.username === "testuser");

      const res = await fetch(`${getBaseUrl()}/api/users/${testUser.id}`, {
        method: "DELETE",
        headers: { Cookie: cookie },
      });
      expect(res.status).toBe(200);

      // Verify user is gone
      const afterRes = await fetch(`${getBaseUrl()}/api/users`, {
        headers: { Cookie: cookie },
      });
      const afterUsers = await afterRes.json();
      expect(afterUsers.find((u: any) => u.username === "testuser")).toBeUndefined();
    });
  });
});
