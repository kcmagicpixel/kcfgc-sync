export interface Worker {
  readonly jobType: string;
  handle(payload: unknown): Promise<unknown | void>;
}
