import { GGTournamentSchema } from "@emily-curry/fgc-sync-common";
import * as z from "zod";

export const mapTournamentToOrg = (
  tournament: z.TypeOf<typeof GGTournamentSchema>
): string | undefined => {
  if (tournament.name.toLocaleLowerCase().includes("magic pixel"))
    return "magic-pixel";

  return undefined;
};
