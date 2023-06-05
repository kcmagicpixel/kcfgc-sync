import { GGTournamentSchema } from "@emily-curry/fgc-sync-common";
import * as z from "zod";
import { mapTournamentToSeries } from "./map-tournament-to-series";

export const mapTournamentToTitle = (
  tournament: z.TypeOf<typeof GGTournamentSchema>
): string => {
  const series = mapTournamentToSeries(tournament);
  if (series.includes("Magic Pixel Weekly")) return "Magic Pixel Weekly";

  return tournament.name;
};
