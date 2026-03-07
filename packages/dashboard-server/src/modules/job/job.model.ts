import { z } from "zod";

export const JobState = z.enum(["pending", "running", "completed", "failed"]);
export type JobState = z.infer<typeof JobState>;

export const Job = z.object({
  id: z.number(),
  type: z.string(),
  state: JobState,
  runAfter: z.number(),
  schedule: z.string().nullable(),
  payload: z.string().transform((s) => JSON.parse(s) as unknown),
  output: z
    .string()
    .nullable()
    .transform((s) => (s ? (JSON.parse(s) as unknown) : null)),
  createdAt: z.number(),
  updatedAt: z.number(),
});

export type Job = z.infer<typeof Job>;
