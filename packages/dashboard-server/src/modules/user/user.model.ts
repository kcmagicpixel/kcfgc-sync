import { z } from "zod";

export const User = z.object({
  id: z.number(),
  username: z.string(),
  passwordHash: z.string(),
});

export type User = z.infer<typeof User>;
