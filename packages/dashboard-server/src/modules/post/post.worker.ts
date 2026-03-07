import { z } from "zod";
import { Container } from "#container";
import { Log } from "#log";
import type { Worker } from "../worker.model.js";
import { PostRepository } from "./post.repository.js";
import { ImageRepository } from "./image.repository.js";
import { BlueskyPostProvider } from "../post-provider/bluesky-provider.service.js";
import { TwitterPostProvider } from "../post-provider/twitter-provider.service.js";
import type { PostProvider } from "../post-provider/post-provider.model.js";

const PostPayload = z.object({
  provider: z.enum(["bluesky", "twitter"]),
  text: z.string(),
  uniqueKey: z.string(),
  imageIds: z.array(z.number()).default([]),
});

export class PostWorker implements Worker {
  readonly jobType = "post";
  private readonly log = Log.child({ module: "PostWorker" });
  private readonly providers: Map<string, PostProvider>;

  constructor(
    private readonly postRepo: PostRepository,
    private readonly imageRepo: ImageRepository,
    bluesky: BlueskyPostProvider,
    twitter: TwitterPostProvider
  ) {
    this.providers = new Map<string, PostProvider>([
      [bluesky.name, bluesky],
      [twitter.name, twitter],
    ]);
  }

  async handle(payload: unknown): Promise<{ url: string }> {
    const {
      provider: providerName,
      text,
      uniqueKey,
      imageIds,
    } = PostPayload.parse(payload);

    const provider = this.providers.get(providerName);
    if (!provider) {
      throw new Error(`Unknown post provider: ${providerName}`);
    }

    const images =
      imageIds.length > 0 ? await this.imageRepo.findByIds(imageIds) : [];
    const imageBuffers = images.map((img) => Buffer.from(img.data));

    const result = await provider.post(text, imageBuffers);
    this.log.info(`Posted via ${providerName}: ${result.url}`);

    await this.postRepo.insert(uniqueKey, providerName, result.url);

    if (imageIds.length > 0) {
      await this.imageRepo.deleteByIds(imageIds);
      this.log.trace(`Deleted ${imageIds.length} image(s) after posting`);
    }

    return { url: result.url };
  }
}

Container.register(PostWorker, [
  PostRepository,
  ImageRepository,
  BlueskyPostProvider,
  TwitterPostProvider,
]);
