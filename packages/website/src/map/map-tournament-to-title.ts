import { GGTournamentSchema } from "@emily-curry/fgc-sync-common";
import * as z from "zod";

export const mapTournamentToTitle = (
  tournament: z.TypeOf<typeof GGTournamentSchema>
): string => {
  return tournament.name;
};
