import { Container } from "#container";
import { Log } from "#log";
import { JobRepository } from "../job/job.repository.js";
import { PostRepository, type PostRow } from "./post.repository.js";
import { BlueskyPostProvider } from "../post-provider/bluesky-provider.service.js";
import { TwitterPostProvider } from "../post-provider/twitter-provider.service.js";
import type { PostProvider } from "../post-provider/post-provider.model.js";
import type { Job } from "../job/job.model.js";

export interface PostListItem {
  job: Job;
  post: PostRow | null;
}

export class PostService {
  private readonly log = Log.child({ module: "PostService" });
  private readonly providers: Map<string, PostProvider>;

  constructor(
    private readonly jobRepo: JobRepository,
    private readonly postRepo: PostRepository,
    bluesky: BlueskyPostProvider,
    twitter: TwitterPostProvider
  ) {
    this.providers = new Map<string, PostProvider>([
      [bluesky.name, bluesky],
      [twitter.name, twitter],
    ]);
  }

  listProviders(): { name: string; enabled: boolean }[] {
    return [...this.providers.values()].map((p) => ({
      name: p.name,
      enabled: p.enabled,
    }));
  }

  async listPosts(): Promise<PostListItem[]> {
    const jobs = await this.jobRepo.findByType("post");
    const uniqueKeys = jobs
      .map((j) => j.uniqueKey)
      .filter((k): k is string => k != null);

    const posts = await this.postRepo.findByUniqueKeys(uniqueKeys);
    const postMap = new Map(posts.map((p) => [p.uniqueKey, p]));

    return jobs.map((job) => ({
      job,
      post: job.uniqueKey ? (postMap.get(job.uniqueKey) ?? null) : null,
    }));
  }

  async createPost(
    providers: string[],
    text: string,
    imageIds: number[],
    key: string,
    runAfter?: number,
    embed?: { url: string; title: string; description?: string; imageId?: number },
  ): Promise<(number | null)[]> {
    const ids: (number | null)[] = [];
    for (const provider of providers) {
      const uniqueKey = `post-${provider}-${key}`;
      const id = await this.jobRepo.createJob(
        "post",
        { provider, text, uniqueKey, imageIds, ...(embed ? { embed } : {}) },
        runAfter,
        null,
        uniqueKey
      );
      ids.push(id);
    }
    return ids;
  }
  async updatePost(
    jobId: number,
    text: string,
    runAfter: number,
    imageIds: number[],
    embed?: { url: string; title: string; description?: string; imageId?: number },
  ): Promise<void> {
    const job = await this.jobRepo.findById(jobId);
    if (!job || job.type !== "post") {
      throw new Error(`Post job not found: ${jobId}`);
    }
    if (job.state !== "pending") {
      throw new Error(`Can only edit pending posts`);
    }
    const payload = job.payload as Record<string, unknown>;
    const updated = await this.jobRepo.updatePendingJob(
      jobId,
      { ...payload, text, imageIds, ...(embed ? { embed } : { embed: undefined }) },
      runAfter,
    );
    if (!updated) {
      throw new Error(`Failed to update post (may no longer be pending)`);
    }
  }

  async deletePost(jobId: number): Promise<void> {
    const job = await this.jobRepo.findById(jobId);
    if (!job || job.type !== "post") {
      throw new Error(`Post job not found: ${jobId}`);
    }

    // If completed, delete from remote service
    if (job.state === "completed" && job.uniqueKey) {
      const posts = await this.postRepo.findByUniqueKeys([job.uniqueKey]);
      const post = posts[0];
      if (post) {
        const provider = this.providers.get(post.provider);
        if (provider) {
          await provider.delete(post.url);
          this.log.info(
            `Deleted remote post via ${post.provider}: ${post.url}`
          );
        }
      }
    }

    // Delete local records
    if (job.uniqueKey) {
      await this.postRepo.deleteByUniqueKey(job.uniqueKey);
    }
    await this.jobRepo.deleteById(job.id);
  }
}

Container.register(PostService, [
  JobRepository,
  PostRepository,
  BlueskyPostProvider,
  TwitterPostProvider,
]);
