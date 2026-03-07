import { AtpAgent } from "@atproto/api";
import { Config } from "#config";
import { Container } from "#container";
import { Log } from "#log";
import type { PostProvider } from "./post-provider.model.js";

export class BlueskyPostProvider implements PostProvider {
  readonly name = "bluesky";
  private readonly log = Log.child({ module: "BlueskyPostProvider" });
  private agent: AtpAgent | null = null;

  private async getAgent(): Promise<AtpAgent> {
    if (this.agent) return this.agent;
    const agent = new AtpAgent({ service: "https://bsky.social" });
    await agent.login({
      identifier: Config.bluesky.identifier,
      password: Config.bluesky.password,
    });
    this.agent = agent;
    return agent;
  }

  async post(text: string, images: Buffer[]): Promise<{ url: string }> {
    const agent = await this.getAgent();

    let embed:
      | { $type: string; images: { alt: string; image: unknown }[] }
      | undefined;
    if (images.length > 0) {
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
      embed: embed as typeof embed & { $type: "app.bsky.embed.images" },
    });

    const rkey = res.uri.split("/").pop();
    const url = `https://bsky.app/profile/${Config.bluesky.identifier}/post/${rkey}`;
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
