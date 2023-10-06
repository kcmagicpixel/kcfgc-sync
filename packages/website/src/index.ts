import { GGTournamentSchema } from "@emily-curry/fgc-sync-common";
import { ArgumentParser } from "argparse";
import { readFileSync, writeFileSync } from "fs";
import { DateTime } from "luxon";
import { resolve } from "path";
import { stringify } from "yaml";
import * as z from "zod";
import {
  mapTournamentToBanner,
  mapTournamentToIcon,
  mapTournamentToOrg,
  mapTournamentToSeries,
  mapTournamentToTitle,
} from "./map";

const TournamentListSchema = z.array(GGTournamentSchema);

const parser = new ArgumentParser({
  description:
    "Reads tournament data from the start.gg manifest and converts them to markdown for the website.",
});

parser.add_argument("--out-dir", {
  type: "str",
  dest: "outDir",
  help: "the directory to output the markdown files",
});

const args = parser.parse_args();
const outDir = resolve(process.cwd(), args.outDir);
console.log("outDir:", outDir);
if (!outDir) {
  throw new Error("--out-dir is required");
}
const input = readFileSync(process.stdin.fd, { encoding: "utf-8" });
const tournaments = TournamentListSchema.parse(JSON.parse(input));

for (const tournament of tournaments) {
  const tournamentEvents = tournament.events
    .filter((ev) => ev.isPublished)
    .sort((a, b) => a.startDate.localeCompare(b.startDate));
  const events = tournamentEvents.map((ev) => {
    return {
      name: ev.game.name,
      start_date: ev.startDate,
      participant_count: ev.entrantCount,
      entry_fee: ev.registrationFee,
      rules: ev.rules,
      url_bracket: ev.isPublished ? ev.brackets[0]?.url : undefined,
      standings: [...(ev.standings ?? [])]
        .sort((a, b) => a.standing - b.standing)
        .map((st) => {
          return {
            player: st.player.name,
            prefix: st.player.prefix,
            standing: st.standing,
          };
        })
        .slice(0, 3),
    };
  });
  const frontMatter = {
    title: mapTournamentToTitle(tournament),
    slug: tournament.slug,
    ref_org: mapTournamentToOrg(tournament),
    ref_banner: mapTournamentToBanner(tournament),
    ref_icon: mapTournamentToIcon(tournament),
    url_startgg: tournament.url,
    address: tournament.address,
    venue_name: tournament.venueName,
    venue_fee: tournament.registrationFee,
    participant_count: tournament.attendeeCount,
    start_date: tournament.startDate,
    end_date: tournament.endDate,
    series: mapTournamentToSeries(tournament),
    rules: tournament.rules,
    stream: tournament.streams?.[0]?.name,
    events: events.length > 0 ? events : undefined,
  };
  const yaml = stringify(frontMatter);

  const document = `---
${yaml}
---

${tournament.description?.trim() ?? ""}
  `;

  const filename = `${DateTime.fromISO(tournament.startDate).toISODate()}-${
    tournament.slug
  }.md`;
  writeFileSync(resolve(outDir, filename), document);
}
