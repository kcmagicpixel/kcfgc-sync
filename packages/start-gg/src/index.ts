import { ArgumentParser } from "argparse";
import { GGTournamentSchema } from "@emily-curry/fgc-sync-common";
import fetch from "node-fetch";
import { request, gql } from "graphql-request";
import * as z from "zod";
import { DateTime } from "luxon";

const GQL_ENDPOINT = "https://api.start.gg/gql/alpha";
const GQL_ENDPOINT_2 = "https://www.start.gg/api/-/gql";
const infoEndpoint = (id: string) =>
  `https://www.start.gg/_next/data/yFljPiYglHmEwg9PBRAK5/en-us/tournament/${id}/dashboard.json`;

const parser = new ArgumentParser({
  description: "Pulls data from the start.gg API.",
});

parser.add_argument("ids", {
  action: "append",
  metavar: "id",
  type: "str",
  nargs: "+",
  help: "the list of tournament ids to extract",
});
parser.add_argument("--api-key", {
  type: "str",
  dest: "apiKey",
  help: "the start.gg developer token. default is env var: START_GG_API_KEY",
  default: process.env["START_GG_API_KEY"],
});

const args = parser.parse_args();
const apiKey = args.apiKey;
const tournamentIds = args.ids[0];
if (!apiKey) {
  throw new Error("--apiKey is required");
}

const tournamentQuery = gql`
  query TournamentQuery($slug: String) {
    tournament(slug: $slug) {
      id
      name
      startAt
      endAt
      timezone
      events {
        id
        name
        numEntrants
        prizingInfo
        videogame {
          id
          images {
            id
            height
            ratio
            type
            url
            width
          }
          name
        }
        startAt
        competitionTier
        standings(query: { page: 0, perPage: 3 }) {
          nodes {
            id
            isFinal
            placement
            standing
            player {
              id
              gamerTag
              prefix
            }
          }
        }
        phaseGroups {
          bracketUrl
          bracketType
        }
      }
      url(relative: false)
      venueAddress
      venueName
      rules
      numAttendees
      images(type: null) {
        id
        height
        ratio
        type
        url
        width
      }
      streams {
        id
        enabled
        streamId
        streamLogo
        streamName
        streamSource
      }
      publishing
    }
  }
`;

const dashboardQuery = gql`
  query PageLayout($profileType: String!, $profileId: Int!, $page: String!) {
    profileWidgetPageLayout(
      profileType: $profileType
      profileId: $profileId
      page: $page
    ) {
      id
      version
      rows {
        columns {
          widgets
        }
      }
    }
  }
`;

let didError = false;

const result: Array<z.infer<typeof GGTournamentSchema>> = [];

for (const tournamentId of tournamentIds) {
  try {
    const { tournament }: any = await request(
      GQL_ENDPOINT,
      tournamentQuery,
      { slug: tournamentId },
      { Authorization: `Bearer ${apiKey}` }
    );
    const infoResponse = await fetch(infoEndpoint(tournamentId));
    const infoResult: Record<string, any> | undefined = infoResponse.ok
      ? ((await infoResponse.json()) as any)
      : undefined;

    const info = infoResult?.pageProps?.fluxStoreData?.find(
      (d: any) => d?.successAction === "TOURNAMENT_FETCHED"
    )?.entities;

    const {
      timezone,
      id,
      name,
      startAt,
      endAt,
      url,
      venueAddress,
      venueName,
      rules,
    } = tournament ?? {};

    const { profileWidgetPageLayout }: any = await request(
      GQL_ENDPOINT_2,
      dashboardQuery,
      {
        page: "details",
        profileType: "tournament",
        profileId: id,
      },
      { ["client-version"]: "20" }
    );

    const widgets = profileWidgetPageLayout?.rows?.flatMap((row: any) => {
      return row?.columns?.flatMap((col: any) => col?.widgets);
    });
    const descriptionWidget = widgets?.find(
      (w: any) => w?.id === "MarkdownWidget"
    );

    const parsed = GGTournamentSchema.parse({
      id,
      name,
      startDate: DateTime.fromSeconds(startAt).setZone(timezone).toISO(),
      endDate: DateTime.fromSeconds(endAt).setZone(timezone).toISO(),
      url,
      address: venueAddress?.trim() || undefined,
      venueName: venueName?.trim() || undefined,
      description: descriptionWidget?.config?.markdown,
      rules: rules?.trim() || undefined,
      attendeeCount: tournament.numAttendees || undefined,
      slug: tournamentId,
      registrationFee: info?.registrationOptionValue?.find(
        (opt: any) => opt?.optionType === "tournament"
      )?.fee,
      isPublished: tournament.publishing?.publish || false,
      isRegistrationOpen: tournament.publishing?.registration ?? false,
      images: tournament.images?.map((img: any) => {
        return {
          ...img,
          id: parseInt(img?.id),
        };
      }),
      streams: tournament.streams?.map((stream: any) => {
        return {
          id: stream?.id,
          streamId: stream?.streamId,
          logo: stream?.streamLogo?.trim() || undefined,
          name: stream?.streamName,
          source: stream?.streamSource,
        };
      }),
      events: tournament.events?.map((event: any) => {
        if (!event) return {};
        const registrationOptionValue = info?.registrationOptionValue?.find(
          (opt: any) =>
            opt?.optionType === "event" && opt?.optionTypeId === event.id
        );
        return {
          id: event.id,
          name: event.name,
          entrantCount: event.numEntrants,
          startDate: DateTime.fromSeconds(event.startAt)
            .setZone(timezone)
            .toISO(),
          competitionTier: event.competitionTier,
          registrationFee:
            registrationOptionValue?.fee > 0
              ? registrationOptionValue.fee
              : undefined,
          prizing: event.prizingInfo.enablePrizing
            ? {
                payoutType: event.prizingInfo.payoutType,
                description: event.prizingInfo.markdown?.trim() || undefined,
                payouts: event.prizingInfo.prizing.map((prize: any) => {
                  if (!prize) return {};
                  return {
                    id: prize.id,
                    placement: prize.placement,
                    percent: prize.percent,
                  };
                }),
              }
            : undefined,
          game: {
            id: event.videogame.id,
            name: event.videogame.name,
            images: event.videogame.images?.map((img: any) => {
              return {
                ...img,
                id: parseInt(img?.id),
              };
            }),
          },
          brackets: event.phaseGroups?.map((pg: any) => {
            return {
              url: pg?.bracketUrl,
              type: pg?.bracketType,
            };
          }),
          standings: event.standings?.nodes?.map((standing: any) => {
            if (!standing) return {};
            return {
              id: standing.id,
              standing: standing.standing,
              placement: standing.placement,
              player: {
                id: standing.player.id,
                name: standing.player.gamerTag,
                prefix: standing.player.prefix?.trim() || undefined,
              },
            };
          }),
        };
      }),
    });
    result.push(parsed);
  } catch (e) {
    process.stderr.write((e as any)?.toString());
    didError = true;
  }
}

process.stdout.write(JSON.stringify(result));
if (didError) process.exit(1);
