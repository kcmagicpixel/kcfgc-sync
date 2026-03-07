export interface PostProvider {
  readonly name: string;
  post(text: string, images: Buffer[]): Promise<{ url: string }>;
  delete(url: string): Promise<void>;
}
