import { GGTournamentSchema } from "@emily-curry/fgc-sync-common";
import * as z from "zod";

export const mapTournamentToSeries = (
  tournament: z.TypeOf<typeof GGTournamentSchema>
): string | undefined => {
  if (tournament.name.toLocaleLowerCase().includes("magic pixel weekly"))
    return "Magic Pixel Weekly";

  return undefined;
};
