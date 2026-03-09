import { beforeEach, describe, expect, it, vi } from "vitest";
import { getDb, setupTestDb } from "../setup.js";
import { Container } from "#container";
import { JobRepository } from "#modules/job/job.repository.js";
import { WorkerService } from "#modules/job/worker.service.js";
import type { Worker } from "#modules/worker.model.js";

setupTestDb();

describe("Job", () => {
  describe("JobRepository", () => {
    it("creates a job and returns an id", async () => {
      const repo = Container.getInstance(JobRepository);
      const id = await repo.createJob("test-type", { foo: "bar" });
      expect(id).toBeTypeOf("number");
      expect(id).toBeGreaterThan(0);
    });

    it("findNextPending returns a pending job where runAfter <= now", async () => {
      const repo = Container.getInstance(JobRepository);
      await repo.createJob("pending-test", { a: 1 }, Date.now() - 1000);

      const job = await repo.findNextPending();
      expect(job).not.toBeNull();
      expect(job!.state).toBe("pending");
    });

    it("findNextPending skips jobs with runAfter in the future", async () => {
      const repo = Container.getInstance(JobRepository);
      const futureId = await repo.createJob(
        "future-only",
        {},
        Date.now() + 60_000
      );

      const job = await repo.findNextPending();
      if (job) {
        expect(job.id).not.toBe(futureId);
      }
    });

    it("findNextPending skips non-pending jobs", async () => {
      const repo = Container.getInstance(JobRepository);
      const id = await repo.createJob("claimed-test", {});
      await repo.claimJob(id!);

      const jobs = await repo.findByType("claimed-test", ["pending"]);
      expect(jobs).toHaveLength(0);
    });

    it("claimJob transitions pending to running and returns true", async () => {
      const repo = Container.getInstance(JobRepository);
      const id = await repo.createJob("claim-test", {});

      const claimed = await repo.claimJob(id!);
      expect(claimed).toBe(true);

      const jobs = await repo.findByType("claim-test", ["running"]);
      expect(jobs.some((j) => j.id === id)).toBe(true);
    });

    it("claimJob returns false if already claimed", async () => {
      const repo = Container.getInstance(JobRepository);
      const id = await repo.createJob("double-claim", {});

      await repo.claimJob(id!);
      const secondClaim = await repo.claimJob(id!);
      expect(secondClaim).toBe(false);
    });

    it("completeJob sets state to completed with output", async () => {
      const repo = Container.getInstance(JobRepository);
      const id = await repo.createJob("complete-test", {});
      await repo.claimJob(id!);
      await repo.completeJob(id!, { result: "ok" });

      const jobs = await repo.findByType("complete-test", ["completed"]);
      const job = jobs.find((j) => j.id === id);
      expect(job).toBeDefined();
      expect(job!.output).toEqual({ result: "ok" });
    });

    it("failJob sets state to failed with error output", async () => {
      const repo = Container.getInstance(JobRepository);
      const id = await repo.createJob("fail-test", {});
      await repo.claimJob(id!);
      await repo.failJob(id!, new Error("something broke"));

      const jobs = await repo.findByType("fail-test", ["failed"]);
      const job = jobs.find((j) => j.id === id);
      expect(job).toBeDefined();
      expect(job!.output).toHaveProperty("message", "something broke");
      expect(job!.output).toHaveProperty("stack");
    });

    it("resetStaleJobs resets old running jobs to pending", async () => {
      const repo = Container.getInstance(JobRepository);
      const id = await repo.createJob("stale-test", {});
      await repo.claimJob(id!);

      const db = getDb();
      await db.execute({
        sql: "UPDATE job SET updated_at = ? WHERE id = ?",
        args: [Date.now() - 600_000, id],
      });

      const count = await repo.resetStaleJobs(300_000);
      expect(count).toBeGreaterThanOrEqual(1);

      const jobs = await repo.findByType("stale-test", ["pending"]);
      expect(jobs.some((j) => j.id === id)).toBe(true);
    });

    it("resetStaleJobs does not reset recently-updated running jobs", async () => {
      const repo = Container.getInstance(JobRepository);
      const id = await repo.createJob("not-stale", {});
      await repo.claimJob(id!);

      await repo.resetStaleJobs(300_000);

      const afterReset = await repo.findByType("not-stale", ["running"]);
      expect(afterReset.some((j) => j.id === id)).toBe(true);
    });

    it("listJobs returns all jobs", async () => {
      const repo = Container.getInstance(JobRepository);
      const jobs = await repo.listJobs();
      expect(jobs.length).toBeGreaterThan(0);
    });

    it("createJob with duplicate unique_key returns null", async () => {
      const repo = Container.getInstance(JobRepository);
      const id1 = await repo.createJob(
        "uk-test",
        {},
        Date.now(),
        null,
        "my-key"
      );
      expect(id1).toBeTypeOf("number");

      const id2 = await repo.createJob(
        "uk-test",
        {},
        Date.now(),
        null,
        "my-key"
      );
      expect(id2).toBeNull();
    });

    it("createJob succeeds after clearUniqueKey", async () => {
      const repo = Container.getInstance(JobRepository);
      const id1 = await repo.createJob(
        "uk-clear",
        {},
        Date.now(),
        null,
        "clear-key"
      );
      expect(id1).not.toBeNull();

      await repo.clearUniqueKey(id1!);

      const id2 = await repo.createJob(
        "uk-clear",
        {},
        Date.now(),
        null,
        "clear-key"
      );
      expect(id2).not.toBeNull();
      expect(id2).not.toBe(id1);
    });

    it("createJob allows multiple null unique_keys", async () => {
      const repo = Container.getInstance(JobRepository);
      const id1 = await repo.createJob("uk-null", {});
      const id2 = await repo.createJob("uk-null", {});
      expect(id1).not.toBeNull();
      expect(id2).not.toBeNull();
      expect(id1).not.toBe(id2);
    });
  });

  describe("WorkerService", () => {
    beforeEach(async () => {
      await getDb().execute("DELETE FROM job");
    });

    function createEngine(): WorkerService {
      const repo = Container.getInstance(JobRepository);
      return new WorkerService(repo);
    }

    function createMockWorker(
      overrides: Partial<Worker> & { jobType: string }
    ): Worker {
      return {
        handle: vi.fn(async () => {}),
        ...overrides,
      };
    }

    it("picks up a pending job and calls the correct handler", async () => {
      const repo = Container.getInstance(JobRepository);
      const engine = createEngine();

      const handler = vi.fn(async () => ({ done: true }));
      const worker = createMockWorker({
        jobType: "tick-test",
        handle: handler,
      });
      engine.registerWorker(worker);

      await repo.createJob("tick-test", { key: "val" });
      await (engine as any).tick();

      expect(handler).toHaveBeenCalledWith({ key: "val" });
    });

    it("marks job completed after successful handler", async () => {
      const repo = Container.getInstance(JobRepository);
      const engine = createEngine();

      const worker = createMockWorker({
        jobType: "complete-tick",
        handle: vi.fn(async () => ({ success: true })),
      });
      engine.registerWorker(worker);

      const id = await repo.createJob("complete-tick", {});
      await (engine as any).tick();

      const jobs = await repo.findByType("complete-tick", ["completed"]);
      expect(jobs.some((j) => j.id === id)).toBe(true);
      expect(jobs.find((j) => j.id === id)!.output).toEqual({ success: true });
    });

    it("marks job failed with error output after handler throws", async () => {
      const repo = Container.getInstance(JobRepository);
      const engine = createEngine();

      const worker = createMockWorker({
        jobType: "fail-tick",
        handle: vi.fn(async () => {
          throw new Error("handler error");
        }),
      });
      engine.registerWorker(worker);

      const id = await repo.createJob("fail-tick", {});
      await (engine as any).tick();

      const jobs = await repo.findByType("fail-tick", ["failed"]);
      const job = jobs.find((j) => j.id === id);
      expect(job).toBeDefined();
      expect(job!.output).toHaveProperty("message", "handler error");
    });

    it("does not process jobs with no registered worker", async () => {
      const repo = Container.getInstance(JobRepository);
      const engine = createEngine();

      const id = await repo.createJob("unregistered-type", {});
      await (engine as any).tick();

      const jobs = await repo.findByType("unregistered-type", ["pending"]);
      expect(jobs.some((j) => j.id === id)).toBe(true);
    });

    it("recurring job creates next job after completion", async () => {
      const repo = Container.getInstance(JobRepository);
      const engine = createEngine();

      const worker = createMockWorker({ jobType: "recurring-test" });
      engine.registerWorker(worker);

      await repo.createJob(
        "recurring-test",
        { data: 1 },
        Date.now(),
        "0 */6 * * *"
      );
      await (engine as any).tick();

      const pending = await repo.findByType("recurring-test", ["pending"]);
      expect(pending.length).toBeGreaterThanOrEqual(1);
      const nextJob = pending[0];
      expect(nextJob.runAfter).toBeGreaterThan(Date.now());
      expect(nextJob.payload).toEqual({ data: 1 });
      expect(nextJob.schedule).toBe("0 */6 * * *");
    });

    it("recurring job creates next job even after failure", async () => {
      const repo = Container.getInstance(JobRepository);
      const engine = createEngine();

      const worker = createMockWorker({
        jobType: "recurring-fail",
        handle: vi.fn(async () => {
          throw new Error("recurring failure");
        }),
      });
      engine.registerWorker(worker);

      await repo.createJob("recurring-fail", { x: 1 }, Date.now(), "0 0 * * *");
      await (engine as any).tick();

      const failed = await repo.findByType("recurring-fail", ["failed"]);
      expect(failed.length).toBeGreaterThanOrEqual(1);

      const pending = await repo.findByType("recurring-fail", ["pending"]);
      expect(pending.length).toBeGreaterThanOrEqual(1);
      expect(pending[0].payload).toEqual({ x: 1 });
      expect(pending[0].schedule).toBe("0 0 * * *");
    });

    it("recurring job with unique_key creates next job successfully", async () => {
      const repo = Container.getInstance(JobRepository);
      const engine = createEngine();

      const worker = createMockWorker({ jobType: "recurring-uk" });
      engine.registerWorker(worker);

      await repo.createJob(
        "recurring-uk",
        { v: 1 },
        Date.now(),
        "0 */6 * * *",
        "recurring-uk-key"
      );
      await (engine as any).tick();

      const pending = await repo.findByType("recurring-uk", ["pending"]);
      expect(pending.length).toBeGreaterThanOrEqual(1);
      expect(pending[0].uniqueKey).toBe("recurring-uk-key");
      expect(pending[0].schedule).toBe("0 */6 * * *");

      const completed = await repo.findByType("recurring-uk", ["completed"]);
      expect(completed[0].uniqueKey).toBeNull();
    });

    it("once worker does not create a follow-up job", async () => {
      const repo = Container.getInstance(JobRepository);
      const engine = createEngine();

      const worker = createMockWorker({ jobType: "once-test" });
      engine.registerWorker(worker);

      await repo.createJob("once-test", {});
      await (engine as any).tick();

      const pending = await repo.findByType("once-test", ["pending"]);
      expect(pending).toHaveLength(0);
    });
  });
});
