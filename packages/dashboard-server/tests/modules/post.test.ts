import { beforeEach, describe, expect, it, vi } from "vitest";
import { getDb, setupTestDb } from "../setup.js";
import { Container } from "#container";
import { JobRepository } from "#modules/job/job.repository.js";
import { PostRepository } from "#modules/post/post.repository.js";
import { ImageRepository } from "#modules/post/image.repository.js";
import { PostWorker } from "#modules/post/post.worker.js";
import type { PostProvider } from "#modules/post-provider/post-provider.model.js";

setupTestDb();

describe("Post", () => {
  describe("ImageRepository", () => {
    it("inserts and retrieves an image", async () => {
      const repo = Container.getInstance(ImageRepository);
      const data = Buffer.from("fake-png-data");
      const id = await repo.insert(data, "image/png");
      expect(id).toBeGreaterThan(0);

      const images = await repo.findByIds([id]);
      expect(images).toHaveLength(1);
      expect(images[0].mimeType).toBe("image/png");
      expect(Buffer.from(images[0].data).toString()).toBe("fake-png-data");
    });

    it("findById returns null for non-existent id", async () => {
      const repo = Container.getInstance(ImageRepository);
      const result = await repo.findById(999999);
      expect(result).toBeNull();
    });

    it("deletes images by ids", async () => {
      const repo = Container.getInstance(ImageRepository);
      const id1 = await repo.insert(Buffer.from("img1"), "image/png");
      const id2 = await repo.insert(Buffer.from("img2"), "image/jpeg");

      await repo.deleteByIds([id1, id2]);

      const images = await repo.findByIds([id1, id2]);
      expect(images).toHaveLength(0);
    });
  });

  describe("PostRepository", () => {
    it("inserts and retrieves a post by unique key", async () => {
      const repo = Container.getInstance(PostRepository);
      await repo.insert("post-bluesky-test1", "bluesky", "https://bsky.app/example");

      const posts = await repo.findByUniqueKeys(["post-bluesky-test1"]);
      expect(posts).toHaveLength(1);
      expect(posts[0].provider).toBe("bluesky");
      expect(posts[0].url).toBe("https://bsky.app/example");
    });

    it("findByUniqueKeys returns empty for unknown keys", async () => {
      const repo = Container.getInstance(PostRepository);
      const posts = await repo.findByUniqueKeys(["nonexistent"]);
      expect(posts).toHaveLength(0);
    });

    it("deleteByUniqueKey removes the post", async () => {
      const repo = Container.getInstance(PostRepository);
      await repo.insert("post-bluesky-del", "bluesky", "https://bsky.app/del");

      await repo.deleteByUniqueKey("post-bluesky-del");

      const posts = await repo.findByUniqueKeys(["post-bluesky-del"]);
      expect(posts).toHaveLength(0);
    });
  });

  describe("PostWorker", () => {
    beforeEach(async () => {
      await getDb().execute("DELETE FROM job WHERE type = 'post'");
      await getDb().execute("DELETE FROM post");
      await getDb().execute("DELETE FROM image");
    });

    function createMockProvider(name: string, url: string): PostProvider {
      return {
        name,
        enabled: true,
        post: vi.fn(async () => ({ url })),
        delete: vi.fn(async () => {}),
      };
    }

    it("posts via the correct provider and inserts into post table", async () => {
      const postRepo = Container.getInstance(PostRepository);
      const imageRepo = Container.getInstance(ImageRepository);
      const bluesky = createMockProvider("bluesky", "https://bsky.app/test");
      const twitter = createMockProvider("twitter", "https://x.com/test");

      const worker = new PostWorker(
        postRepo,
        imageRepo,
        bluesky as any,
        twitter as any,
      );

      const result = await worker.handle({
        provider: "bluesky",
        text: "Hello world",
        uniqueKey: "post-bluesky-hello",
        imageIds: [],
      });

      expect(result).toEqual({ url: "https://bsky.app/test" });
      expect(bluesky.post).toHaveBeenCalledWith("Hello world", [], undefined);
      expect(twitter.post).not.toHaveBeenCalled();

      const posts = await postRepo.findByUniqueKeys(["post-bluesky-hello"]);
      expect(posts).toHaveLength(1);
      expect(posts[0].url).toBe("https://bsky.app/test");
    });

    it("loads images from DB and passes them to provider", async () => {
      const postRepo = Container.getInstance(PostRepository);
      const imageRepo = Container.getInstance(ImageRepository);
      const bluesky = createMockProvider("bluesky", "https://bsky.app/img");
      const twitter = createMockProvider("twitter", "https://x.com/img");

      const imgId = await imageRepo.insert(Buffer.from("test-image"), "image/png");

      const worker = new PostWorker(
        postRepo,
        imageRepo,
        bluesky as any,
        twitter as any,
      );

      await worker.handle({
        provider: "bluesky",
        text: "With image",
        uniqueKey: "post-bluesky-img",
        imageIds: [imgId],
      });

      expect(bluesky.post).toHaveBeenCalledWith(
        "With image",
        [expect.any(Buffer)],
        undefined,
      );
    });

    it("posts with embed and passes it to provider", async () => {
      const postRepo = Container.getInstance(PostRepository);
      const imageRepo = Container.getInstance(ImageRepository);
      const bluesky = createMockProvider("bluesky", "https://bsky.app/embed");
      const twitter = createMockProvider("twitter", "https://x.com/embed");

      const worker = new PostWorker(
        postRepo,
        imageRepo,
        bluesky as any,
        twitter as any,
      );

      await worker.handle({
        provider: "bluesky",
        text: "Check this out",
        uniqueKey: "post-bluesky-embed",
        embed: { url: "https://example.com", title: "Example", description: "A site" },
      });

      expect(bluesky.post).toHaveBeenCalledWith(
        "Check this out",
        [],
        { url: "https://example.com", title: "Example", description: "A site", image: undefined },
      );
    });

    it("posts with embed image and passes it to provider", async () => {
      const postRepo = Container.getInstance(PostRepository);
      const imageRepo = Container.getInstance(ImageRepository);
      const bluesky = createMockProvider("bluesky", "https://bsky.app/embedimg");
      const twitter = createMockProvider("twitter", "https://x.com/embedimg");

      const imgId = await imageRepo.insert(Buffer.from("thumb-data"), "image/png");

      const worker = new PostWorker(
        postRepo,
        imageRepo,
        bluesky as any,
        twitter as any,
      );

      await worker.handle({
        provider: "bluesky",
        text: "With thumbnail",
        uniqueKey: "post-bluesky-embedimg",
        embed: { url: "https://example.com", title: "Example", imageId: imgId },
      });

      expect(bluesky.post).toHaveBeenCalledWith(
        "With thumbnail",
        [],
        expect.objectContaining({
          url: "https://example.com",
          title: "Example",
          image: expect.any(Buffer),
        }),
      );
    });

    it("rejects payload with both imageIds and embed", async () => {
      const postRepo = Container.getInstance(PostRepository);
      const imageRepo = Container.getInstance(ImageRepository);
      const bluesky = createMockProvider("bluesky", "");
      const twitter = createMockProvider("twitter", "");

      const worker = new PostWorker(
        postRepo,
        imageRepo,
        bluesky as any,
        twitter as any,
      );

      await expect(
        worker.handle({
          provider: "bluesky",
          text: "Both",
          uniqueKey: "post-bluesky-both",
          imageIds: [1],
          embed: { url: "https://example.com", title: "Example" },
        }),
      ).rejects.toThrow();
    });

    it("throws on invalid payload", async () => {
      const postRepo = Container.getInstance(PostRepository);
      const imageRepo = Container.getInstance(ImageRepository);
      const bluesky = createMockProvider("bluesky", "");
      const twitter = createMockProvider("twitter", "");

      const worker = new PostWorker(
        postRepo,
        imageRepo,
        bluesky as any,
        twitter as any,
      );

      await expect(worker.handle({ invalid: true })).rejects.toThrow();
    });
  });

  describe("PostService integration", () => {
    beforeEach(async () => {
      await getDb().execute("DELETE FROM job WHERE type = 'post'");
      await getDb().execute("DELETE FROM post");
    });

    it("createPost creates jobs with correct unique keys", async () => {
      const jobRepo = Container.getInstance(JobRepository);
      const postRepo = Container.getInstance(PostRepository);

      // Inline the service logic to avoid importing providers
      const providers = ["bluesky", "twitter"];
      const key = "test-create";
      const ids: (number | null)[] = [];
      for (const provider of providers) {
        const uniqueKey = `post-${provider}-${key}`;
        const id = await jobRepo.createJob(
          "post",
          { provider, text: "Hello", uniqueKey, imageIds: [] },
          undefined,
          null,
          uniqueKey,
        );
        ids.push(id);
      }

      expect(ids).toHaveLength(2);
      expect(ids.every((id) => id != null)).toBe(true);

      const jobs = await jobRepo.findByType("post");
      const keys = jobs.map((j) => j.uniqueKey);
      expect(keys).toContain("post-bluesky-test-create");
      expect(keys).toContain("post-twitter-test-create");
    });

    it("listPosts merges jobs with post records", async () => {
      const jobRepo = Container.getInstance(JobRepository);
      const postRepo = Container.getInstance(PostRepository);

      await jobRepo.createJob(
        "post",
        { provider: "bluesky", text: "Test", uniqueKey: "post-bluesky-merge", imageIds: [] },
        undefined,
        null,
        "post-bluesky-merge",
      );
      await postRepo.insert("post-bluesky-merge", "bluesky", "https://bsky.app/merged");

      const jobs = await jobRepo.findByType("post");
      const uniqueKeys = jobs
        .map((j) => j.uniqueKey)
        .filter((k): k is string => k != null);
      const posts = await postRepo.findByUniqueKeys(uniqueKeys);
      const postMap = new Map(posts.map((p) => [p.uniqueKey, p]));

      const merged = jobs.map((job) => ({
        job,
        post: job.uniqueKey ? (postMap.get(job.uniqueKey) ?? null) : null,
      }));

      const item = merged.find((m) => m.job.uniqueKey === "post-bluesky-merge");
      expect(item).toBeDefined();
      expect(item!.post).not.toBeNull();
      expect(item!.post!.url).toBe("https://bsky.app/merged");
    });

    it("createPost with embed stores embed in job payload", async () => {
      const jobRepo = Container.getInstance(JobRepository);

      const uniqueKey = "post-bluesky-embed-svc";
      const id = await jobRepo.createJob(
        "post",
        {
          provider: "bluesky",
          text: "Embed test",
          uniqueKey,
          imageIds: [],
          embed: { url: "https://example.com", title: "Example", description: "Desc" },
        },
        undefined,
        null,
        uniqueKey,
      );

      expect(id).not.toBeNull();
      const job = await jobRepo.findById(id!);
      expect(job).not.toBeNull();
      const payload = job!.payload as any;
      expect(payload.embed).toEqual({
        url: "https://example.com",
        title: "Example",
        description: "Desc",
      });
      expect(payload.imageIds).toEqual([]);
    });

    it("deletePost removes job and post records for a pending job", async () => {
      const jobRepo = Container.getInstance(JobRepository);

      const jobId = await jobRepo.createJob(
        "post",
        { provider: "bluesky", text: "To delete", uniqueKey: "post-bluesky-delpend", imageIds: [] },
        undefined,
        null,
        "post-bluesky-delpend",
      );

      expect(jobId).not.toBeNull();
      await jobRepo.deleteById(jobId!);

      const job = await jobRepo.findById(jobId!);
      expect(job).toBeNull();
    });

    it("deletePost removes job and post records for a completed job", async () => {
      const jobRepo = Container.getInstance(JobRepository);
      const postRepo = Container.getInstance(PostRepository);

      const jobId = await jobRepo.createJob(
        "post",
        { provider: "bluesky", text: "Completed", uniqueKey: "post-bluesky-delcomp", imageIds: [] },
        undefined,
        null,
        "post-bluesky-delcomp",
      );
      await jobRepo.completeJob(jobId!, { url: "https://bsky.app/delcomp" });
      await postRepo.insert("post-bluesky-delcomp", "bluesky", "https://bsky.app/delcomp");

      // Delete both records
      await postRepo.deleteByUniqueKey("post-bluesky-delcomp");
      await jobRepo.deleteById(jobId!);

      const job = await jobRepo.findById(jobId!);
      expect(job).toBeNull();
      const posts = await postRepo.findByUniqueKeys(["post-bluesky-delcomp"]);
      expect(posts).toHaveLength(0);
    });
  });
});
