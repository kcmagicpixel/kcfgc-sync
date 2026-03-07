import { AtpAgent } from "@atproto/api";
import { Config } from "#config";
import { Container } from "#container";
import { Log } from "#log";
import type { PostProvider, PostEmbed } from "./post-provider.model.js";

export class BlueskyPostProvider implements PostProvider {
  readonly name = "bluesky";
  readonly enabled = Config.bluesky != null;
  private readonly log = Log.child({ module: "BlueskyPostProvider" });
  private agent: AtpAgent | null = null;

  private async getAgent(): Promise<AtpAgent> {
    if (!Config.bluesky) throw new Error("Bluesky provider is not configured");
    if (this.agent) return this.agent;
    const agent = new AtpAgent({ service: "https://bsky.social" });
    await agent.login({
      identifier: Config.bluesky.identifier,
      password: Config.bluesky.password,
    });
    this.agent = agent;
    return agent;
  }

  async post(text: string, images: Buffer[], postEmbed?: PostEmbed): Promise<{ url: string }> {
    const agent = await this.getAgent();

    let embed:
      | { $type: string; images: { alt: string; image: unknown }[] }
      | { $type: string; external: { uri: string; title: string; description: string; thumb?: unknown } }
      | undefined;

    if (postEmbed) {
      let thumb: unknown;
      if (postEmbed.image) {
        const res = await agent.uploadBlob(postEmbed.image, {
          encoding: "image/png",
        });
        thumb = res.data.blob;
      }
      embed = {
        $type: "app.bsky.embed.external",
        external: {
          uri: postEmbed.url,
          title: postEmbed.title,
          description: postEmbed.description ?? "",
          ...(thumb ? { thumb } : {}),
        },
      };
    } else if (images.length > 0) {
      const uploadedImages = await Promise.all(
        images.map(async (data) => {
          const res = await agent.uploadBlob(data, {
            encoding: "image/png",
          });
          return { alt: "", image: res.data.blob };
        })
      );
      embed = {
        $type: "app.bsky.embed.images",
        images: uploadedImages,
      };
    }

    const res = await agent.post({
      text,
      embed: embed as any,
    });

    const rkey = res.uri.split("/").pop();
    const url = `https://bsky.app/profile/${Config.bluesky!.identifier}/post/${rkey}`;
    this.log.info(`Posted to Bluesky: ${url}`);
    return { url };
  }
  async delete(url: string): Promise<void> {
    const agent = await this.getAgent();
    const rkey = url.split("/").pop();
    if (!rkey) throw new Error(`Cannot extract rkey from URL: ${url}`);
    await agent.deletePost(
      `at://${agent.session?.did}/app.bsky.feed.post/${rkey}`
    );
    this.log.info(`Deleted from Bluesky: ${url}`);
  }
}

Container.register(BlueskyPostProvider, []);
