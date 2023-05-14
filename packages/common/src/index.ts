import * as z from "zod";

export const GGImageSchema = z.object({
  id: z.number(),
  height: z.number(),
  width: z.number(),
  ratio: z.number(),
  type: z.enum(["profile", "banner", "primary", "primary-quality"]),
  url: z.string(),
});

export const GGStreamSchema = z.object({
  id: z.number(),
  streamId: z.string(),
  logo: z.string().optional(),
  name: z.string(),
  source: z.enum(["TWITCH"]),
});

export const GGVideogameSchema = z.object({
  id: z.number(),
  name: z.string(),
  images: z.array(GGImageSchema),
});

export const GGEventPrizingPayoutSchema = z.object({
  id: z.number(),
  placement: z.number(),
  percent: z.number(),
});

export const GGEventPrizingSchema = z.object({
  payoutType: z.enum(["percentage"]),
  description: z.string().optional(),
  payouts: z.array(GGEventPrizingPayoutSchema),
});

export const GGPlayerSchema = z.object({
  id: z.number(),
  name: z.string(),
  prefix: z.string().optional(),
});

export const GGStandingSchema = z.object({
  id: z.number(),
  standing: z.number(),
  placement: z.number(),
  player: GGPlayerSchema,
});

export const GGBracketSchema = z.object({
  type: z.enum([
    "SINGLE_ELIMINATION",
    "DOUBLE_ELIMINATION",
    "ROUND_ROBIN",
    "SWISS",
    "EXHIBITION",
    "CUSTOM_SCHEDULE",
    "MATCHMAKING",
    "ELIMINATION_ROUNDS",
    "RACE",
    "CIRCUIT",
  ]),
  url: z.string(),
});

export const GGEventSchema = z.object({
  id: z.number(),
  name: z.string(),
  entrantCount: z.number(),
  startDate: z.string().datetime({ offset: true }),
  competitionTier: z.number(),
  registrationFee: z.number().optional(),
  rules: z.string().optional(),
  prizing: GGEventPrizingSchema.optional(),
  game: GGVideogameSchema,
  standings: z.array(GGStandingSchema).optional(),
  brackets: z.array(GGBracketSchema),
});

export const GGTournamentSchema = z.object({
  id: z.number(),
  name: z.string(),
  startDate: z.string().datetime({ offset: true }),
  endDate: z.string().datetime({ offset: true }),
  url: z.string(),
  address: z.string().optional(),
  venueName: z.string().optional(),
  description: z.string().optional(),
  rules: z.string().optional(),
  attendeeCount: z.number().optional(),
  slug: z.string(),
  registrationFee: z.number().optional(),
  isPublished: z.boolean(),
  isRegistrationOpen: z.boolean(),
  events: z.array(GGEventSchema),
  images: z.array(GGImageSchema),
  streams: z.array(GGStreamSchema),
});
