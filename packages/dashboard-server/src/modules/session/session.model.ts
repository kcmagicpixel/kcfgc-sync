import z from "zod";

export const Session = z.object({
  id: z.number(),
  sessionId: z.string(),
  userId: z.number(),
  createdAt: z.number(),
  deletedAt: z.number(),
});
