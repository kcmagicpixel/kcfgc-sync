import { TwitterApi, EUploadMimeType } from "twitter-api-v2";
import { Config } from "#config";
import { Container } from "#container";
import { Log } from "#log";
import type { PostProvider, PostEmbed } from "./post-provider.model.js";

export class TwitterPostProvider implements PostProvider {
  readonly name = "twitter";
  readonly enabled = Config.twitter != null;
  private readonly log = Log.child({ module: "TwitterPostProvider" });

  private getClient(): TwitterApi {
    if (!Config.twitter) throw new Error("Twitter provider is not configured");
    return new TwitterApi({
      appKey: Config.twitter.appKey,
      appSecret: Config.twitter.appSecret,
      accessToken: Config.twitter.accessToken,
      accessSecret: Config.twitter.accessSecret,
    });
  }

  async post(text: string, images: Buffer[], embed?: PostEmbed): Promise<{ url: string }> {
    const client = this.getClient();

    let mediaIds: string[] | undefined;
    let tweetText = text;

    if (embed) {
      // Upload embed thumbnail if present
      if (embed.image) {
        const mediaId = await client.v2.uploadMedia(embed.image, {
          media_type: EUploadMimeType.Png,
        });
        mediaIds = [mediaId];
      }
      // Append embed URL to post body
      tweetText = `${text}\n\n${embed.url}`;
    } else if (images.length > 0) {
      mediaIds = await Promise.all(
        images.map((data) =>
          client.v2.uploadMedia(data, {
            media_type: EUploadMimeType.Png,
          })
        )
      );
    }

    type MediaIds =
      | [string]
      | [string, string]
      | [string, string, string]
      | [string, string, string, string];
    const tweet = await client.v2.tweet(tweetText, {
      media: mediaIds ? { media_ids: mediaIds as MediaIds } : undefined,
    });

    const url = `https://x.com/i/status/${tweet.data.id}`;
    this.log.info(`Posted to Twitter: ${url}`);
    return { url };
  }
  async delete(url: string): Promise<void> {
    const client = this.getClient();
    const tweetId = url.split("/").pop();
    if (!tweetId) throw new Error(`Cannot extract tweet ID from URL: ${url}`);
    await client.v2.deleteTweet(tweetId);
    this.log.info(`Deleted from Twitter: ${url}`);
  }
}

Container.register(TwitterPostProvider, []);
