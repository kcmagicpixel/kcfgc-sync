import { GGTournamentSchema } from "@emily-curry/fgc-sync-common";
import * as z from "zod";
import { mapTournamentToSeries } from "./map-tournament-to-series";

export const mapTournamentToTitle = (
  tournament: z.TypeOf<typeof GGTournamentSchema>
): string => {
  const series = mapTournamentToSeries(tournament);
  if (series === "Magic Pixel Weekly") return series;

  return tournament.name;
};
