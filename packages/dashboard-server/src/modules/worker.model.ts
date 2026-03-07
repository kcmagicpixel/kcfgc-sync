export type WorkerSchedule =
  | { type: "once" }
  | { type: "recurring"; schedule: string };

export interface Worker {
  readonly jobType: string;
  readonly schedule: WorkerSchedule;
  handle(payload: unknown): Promise<unknown | void>;
}
