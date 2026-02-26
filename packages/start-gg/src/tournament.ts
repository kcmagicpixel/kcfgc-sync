import {
  GGTournamentSchema,
  loadTournament,
} from "@emily-curry/fgc-sync-common";
import * as z from "zod";

export const loadTournaments = async (
  apiKey: string,
  tournamentIds: string[]
) => {
  let didError = false;
  const result: Array<z.infer<typeof GGTournamentSchema>> = [];

  for (const tournamentId of tournamentIds) {
    try {
      const parsed = await loadTournament(tournamentId, apiKey);
      result.push(parsed);
    } catch (e) {
      console.error(`[${tournamentId}]`, e);
      didError = true;
    }
  }

  process.stdout.write(JSON.stringify(result));
  if (didError) process.exit(1);
};
