export interface PostEmbed {
  url: string;
  title: string;
  description?: string;
  image?: Buffer;
}

export interface PostProvider {
  readonly name: string;
  readonly enabled: boolean;
  post(
    text: string,
    images: Buffer[],
    embed?: PostEmbed
  ): Promise<{ url: string }>;
  delete(url: string): Promise<void>;
}
