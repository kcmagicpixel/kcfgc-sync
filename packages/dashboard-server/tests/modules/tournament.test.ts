import { describe, expect, it, vi } from "vitest";
import { getDb, setupTestDb } from "../setup.js";
import { Container } from "#container";
import { TournamentRepository } from "#modules/tournament/tournament.repository.js";
import { JobRepository } from "#modules/job/job.repository.js";
import { HubWorker } from "#modules/tournament/hub.worker.js";
import { TournamentWorker } from "#modules/tournament/tournament.worker.js";

vi.mock("@emily-curry/fgc-sync-common", () => ({
  loadHub: vi.fn(),
  loadTournament: vi.fn(),
}));

import { loadHub, loadTournament } from "@emily-curry/fgc-sync-common";

setupTestDb();

describe("Tournament", () => {
  describe("TournamentRepository", () => {
    it("inserts a new tournament", async () => {
      const repo = Container.getInstance(TournamentRepository);
      await repo.upsert("test-slug", { name: "Test Tournament" });

      const db = getDb();
      const result = await db.execute({
        sql: "SELECT key, data FROM tournament WHERE key = ?",
        args: ["test-slug"],
      });
      expect(result.rows).toHaveLength(1);
      expect(JSON.parse(result.rows[0]["data"] as string)).toEqual({
        name: "Test Tournament",
      });
    });

    it("updates existing tournament on conflict", async () => {
      const repo = Container.getInstance(TournamentRepository);
      await repo.upsert("upsert-slug", { version: 1 });
      await repo.upsert("upsert-slug", { version: 2 });

      const db = getDb();
      const result = await db.execute({
        sql: "SELECT data FROM tournament WHERE key = ?",
        args: ["upsert-slug"],
      });
      expect(result.rows).toHaveLength(1);
      expect(JSON.parse(result.rows[0]["data"] as string)).toEqual({
        version: 2,
      });
    });
  });

  describe("HubWorker", () => {
    it("calls loadHub and creates tournament jobs", async () => {
      vi.mocked(loadHub).mockResolvedValue({
        id: 1,
        name: "Test Hub",
        slug: "test-hub",
        tournaments: [
          { id: 10, name: "T1", slug: "tournament-1" },
          { id: 20, name: "T2", slug: "tournament-2" },
        ],
      });

      const worker = Container.getInstance(HubWorker);
      const result = await worker.handle({ slug: "test-hub", limit: 10 });

      expect(loadHub).toHaveBeenCalledWith("test-hub", 10);
      expect(result).toEqual({ created: 2 });

      const repo = Container.getInstance(JobRepository);
      const jobs = await repo.findByType("tournament", ["pending"]);
      const slugs = jobs.map((j) => (j.payload as { slug: string }).slug);
      expect(slugs).toContain("tournament-1");
      expect(slugs).toContain("tournament-2");
    });
  });

  describe("TournamentWorker", () => {
    it("calls loadTournament and upserts data", async () => {
      const tournamentData = {
        id: 99,
        name: "Big Event",
        slug: "big-event",
        events: [],
      };
      vi.mocked(loadTournament).mockResolvedValue(tournamentData as any);

      const worker = Container.getInstance(TournamentWorker);
      await worker.handle({ slug: "big-event" });

      expect(loadTournament).toHaveBeenCalledWith(
        "big-event",
        expect.any(String),
      );

      const db = getDb();
      const result = await db.execute({
        sql: "SELECT data FROM tournament WHERE key = ?",
        args: ["big-event"],
      });
      expect(result.rows).toHaveLength(1);
      expect(JSON.parse(result.rows[0]["data"] as string)).toEqual(
        tournamentData,
      );
    });
  });
});
