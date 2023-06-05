import { GGTournamentSchema } from "@emily-curry/fgc-sync-common";
import * as z from "zod";
import { mapTournamentToSeries } from "./map-tournament-to-series";

export const mapTournamentToBanner = (
  tournament: z.TypeOf<typeof GGTournamentSchema>
): string | undefined => {
  const series = mapTournamentToSeries(tournament);
  if (series.includes("Magic Pixel Weekly")) return "images/mp_banner.png";

  return tournament.images.find((img) => img.type === "banner")?.url;
};
