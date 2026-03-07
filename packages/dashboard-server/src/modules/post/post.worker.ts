import { z } from "zod";
import { Container } from "#container";
import { Log } from "#log";
import type { Worker } from "../worker.model.js";
import { PostRepository } from "./post.repository.js";
import { ImageRepository } from "./image.repository.js";
import { BlueskyPostProvider } from "../post-provider/bluesky-provider.service.js";
import { TwitterPostProvider } from "../post-provider/twitter-provider.service.js";
import type { PostProvider, PostEmbed } from "../post-provider/post-provider.model.js";

const EmbedPayload = z.object({
  url: z.string(),
  title: z.string(),
  description: z.string().optional(),
  imageId: z.number().optional(),
});

const PostPayload = z.object({
  provider: z.enum(["bluesky", "twitter"]),
  text: z.string(),
  uniqueKey: z.string(),
  imageIds: z.array(z.number()).default([]),
  embed: EmbedPayload.optional(),
}).refine(
  (data) => !(data.imageIds.length > 0 && data.embed),
  { message: "Cannot have both imageIds and embed" },
);

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
      embed: embedPayload,
    } = PostPayload.parse(payload);

    const provider = this.providers.get(providerName);
    if (!provider) {
      throw new Error(`Unknown post provider: ${providerName}`);
    }

    // Resolve embed with image buffer if present
    let embed: PostEmbed | undefined;
    const imageIdsToCleanup: number[] = [];

    if (embedPayload) {
      let image: Buffer | undefined;
      if (embedPayload.imageId != null) {
        const img = await this.imageRepo.findById(embedPayload.imageId);
        if (img) {
          image = Buffer.from(img.data);
          imageIdsToCleanup.push(embedPayload.imageId);
        }
      }
      embed = {
        url: embedPayload.url,
        title: embedPayload.title,
        description: embedPayload.description,
        image,
      };
    }

    // Resolve image buffers
    const images =
      imageIds.length > 0 ? await this.imageRepo.findByIds(imageIds) : [];
    const imageBuffers = images.map((img) => Buffer.from(img.data));
    imageIdsToCleanup.push(...imageIds);

    const result = await provider.post(text, imageBuffers, embed);
    this.log.info(`Posted via ${providerName}: ${result.url}`);

    await this.postRepo.insert(uniqueKey, providerName, result.url);

    if (imageIdsToCleanup.length > 0) {
      await this.imageRepo.deleteByIds(imageIdsToCleanup);
      this.log.trace(`Deleted ${imageIdsToCleanup.length} image(s) after posting`);
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
