import { describe, expect, it } from "vitest";
import { getDb, setupTestDb } from "../setup.js";
import { Container } from "#container";
import { SessionRepository } from "#modules/session/session.repository.js";
import { SessionService } from "#modules/session/session.service.js";

setupTestDb();

describe("Session", () => {
  describe("SessionRepository", () => {
    it("creates a session and finds it by sessionId", async () => {
      const repo = Container.getInstance(SessionRepository);
      await repo.create("repo-test-1", 1);

      const session = await repo.findBySessionId("repo-test-1");
      expect(session).not.toBeNull();
      expect(session!.sessionId).toBe("repo-test-1");
      expect(session!.userId).toBe(1);
      expect(session!.deletedAt).toBeNull();
      expect(session!.createdAt).toBeTypeOf("number");
    });

    it("returns null for a non-existent sessionId", async () => {
      const repo = Container.getInstance(SessionRepository);
      const session = await repo.findBySessionId("does-not-exist");
      expect(session).toBeNull();
    });

    it("soft-deletes a session by sessionId", async () => {
      const repo = Container.getInstance(SessionRepository);
      await repo.create("repo-test-delete", 1);

      await repo.deleteBySessionId("repo-test-delete");

      const session = await repo.findBySessionId("repo-test-delete");
      expect(session).toBeNull();

      // Verify the row still exists with deleted_at set
      const db = getDb();
      const result = await db.execute({
        sql: "SELECT deleted_at FROM session WHERE session_id = ?",
        args: ["repo-test-delete"],
      });
      expect(result.rows.length).toBe(1);
      expect(result.rows[0]["deleted_at"]).toBeTypeOf("number");
    });

    it("does not delete an already-deleted session", async () => {
      const repo = Container.getInstance(SessionRepository);
      await repo.create("repo-test-idempotent", 1);

      await repo.deleteBySessionId("repo-test-idempotent");
      await repo.deleteBySessionId("repo-test-idempotent");

      const db = getDb();
      const result = await db.execute({
        sql: "SELECT deleted_at FROM session WHERE session_id = ?",
        args: ["repo-test-idempotent"],
      });
      expect(result.rows.length).toBe(1);
    });

    it("finds a session by row id", async () => {
      const repo = Container.getInstance(SessionRepository);
      await repo.create("repo-test-find-id", 1);

      const allSessions = await repo.findAllByUserId(1);
      const target = allSessions.find(
        (s) => s.sessionId === "repo-test-find-id"
      )!;

      const found = await repo.findById(target.id);
      expect(found).not.toBeNull();
      expect(found!.sessionId).toBe("repo-test-find-id");
      expect(found!.userId).toBe(1);
    });

    it("returns null for findById with non-existent id", async () => {
      const repo = Container.getInstance(SessionRepository);
      const session = await repo.findById(999999);
      expect(session).toBeNull();
    });

    it("soft-deletes a session by row id", async () => {
      const repo = Container.getInstance(SessionRepository);
      await repo.create("repo-test-delete-id", 1);

      const allSessions = await repo.findAllByUserId(1);
      const target = allSessions.find(
        (s) => s.sessionId === "repo-test-delete-id"
      )!;

      const deleted = await repo.deleteById(target.id);
      expect(deleted).toBe(true);

      const found = await repo.findById(target.id);
      expect(found).toBeNull();
    });

    it("returns false when deleting a non-existent session by id", async () => {
      const repo = Container.getInstance(SessionRepository);
      const deleted = await repo.deleteById(999999);
      expect(deleted).toBe(false);
    });
  });

  describe("SessionService", () => {
    it("creates a session and retrieves it", async () => {
      const service = Container.getInstance(SessionService);
      await service.create("svc-test-1", 1);

      const session = await service.findBySessionId("svc-test-1");
      expect(session).not.toBeNull();
      expect(session!.sessionId).toBe("svc-test-1");
      expect(session!.userId).toBe(1);
    });

    it("returns null for a non-existent session", async () => {
      const service = Container.getInstance(SessionService);
      const session = await service.findBySessionId("svc-does-not-exist");
      expect(session).toBeNull();
    });

    it("destroys a session so it can no longer be found", async () => {
      const service = Container.getInstance(SessionService);
      await service.create("svc-test-destroy", 1);

      await service.destroy("svc-test-destroy");

      const session = await service.findBySessionId("svc-test-destroy");
      expect(session).toBeNull();
    });

    it("destroys a session by row id", async () => {
      const service = Container.getInstance(SessionService);
      await service.create("svc-test-destroy-id", 1);

      const found = await service.findBySessionId("svc-test-destroy-id");
      expect(found).not.toBeNull();

      const deleted = await service.destroyById(found!.id);
      expect(deleted).toBe(true);

      const after = await service.findById(found!.id);
      expect(after).toBeNull();
    });
  });
});
