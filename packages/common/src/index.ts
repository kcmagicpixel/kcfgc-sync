import * as z from "zod";

export const EventSchema = z.object({});

export type Event = z.infer<typeof EventSchema>;
