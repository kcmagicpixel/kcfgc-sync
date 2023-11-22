import { GGTournamentSchema } from "@emily-curry/fgc-sync-common";
import { request } from "graphql-request";
import { DateTime } from "luxon";
import fetch from "node-fetch";
import * as z from "zod";
import {
  GQL_ENDPOINT,
  GQL_ENDPOINT_ALT,
  fetchDataId,
  infoEndpoint,
  withRetry,
} from "./util";
import { dashboardQuery } from "./query/dashboard-query";
import { tournamentQuery } from "./query/tournament-query";

const getExtraInfo = async (
  tournamentId: string
): Promise<Record<string, any> | undefined> => {
  let dataId: string | undefined;
  try {
    dataId = await fetchDataId();
  } catch {
    return undefined;
  }
  const infoResponse = await fetch(infoEndpoint(tournamentId, dataId));
  if (!infoResponse.ok) return undefined;
  return await infoResponse.json();
};

const loadTournament = withRetry(
  async (tournamentId: string, apiKey: string) => {
    const { tournament }: any = await request(
      GQL_ENDPOINT,
      tournamentQuery,
      { slug: tournamentId },
      { Authorization: `Bearer ${apiKey}` }
    );
    const infoResult = await getExtraInfo(tournamentId);

    const info = infoResult?.pageProps?.fluxStoreData?.find(
      (d: any) => d?.successAction === "TOURNAMENT_FETCHED"
    )?.entities;

    const {
      timezone,
      id,
      name,
      startAt,
      endAt,
      createdAt,
      url,
      venueAddress,
      venueName,
      rules,
    } = tournament ?? {};

    const { profileWidgetPageLayout }: any = await request(
      GQL_ENDPOINT_ALT,
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
    const locationWidget = widgets?.find(
      (w: any) => w?.id === "LocationWidget"
    );

    const parsed = GGTournamentSchema.parse({
      id,
      name,
      startDate: DateTime.fromSeconds(startAt).setZone(timezone).toISO(),
      endDate: DateTime.fromSeconds(endAt).setZone(timezone).toISO(),
      createdDate: DateTime.fromSeconds(createdAt).setZone(timezone).toISO(),
      url,
      address: venueAddress?.trim?.() || undefined,
      venueName:
        locationWidget?.config?.venueName?.trim?.() ||
        venueName?.trim?.() ||
        undefined,
      description: descriptionWidget?.config?.markdown,
      rules: rules?.trim?.() || undefined,
      attendeeCount: tournament.numAttendees || undefined,
      slug: tournamentId,
      registrationFee: info?.registrationOptionValue?.find(
        (opt: any) => opt?.optionType === "tournament"
      )?.fee,
      isPublished: tournament.publishing?.publish || false,
      isRegistrationOpen: tournament.publishing?.registration ?? false,
      images:
        tournament.images?.map((img: any) => {
          return {
            ...img,
            id: parseInt(img?.id),
          };
        }) ?? [],
      streams:
        tournament.streams?.map((stream: any) => {
          return {
            id: stream?.id,
            streamId: stream?.streamId,
            logo: stream?.streamLogo?.trim?.() || undefined,
            name: stream?.streamName,
            source: stream?.streamSource,
          };
        }) ?? [],
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
          rules: event.rulesMarkdown?.trim?.() || undefined,
          isPublished: event.publishing?.publish || false,
          prizing: event.prizingInfo.enablePrizing
            ? {
                payoutType: event.prizingInfo.payoutType,
                description: event.prizingInfo.markdown?.trim?.() || undefined,
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
                prefix: standing.player.prefix?.trim?.() || undefined,
              },
            };
          }),
        };
      }),
    });
    return parsed;
  }
);

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
      process.stderr.write((e as any)?.toString());
      didError = true;
    }
  }

  process.stdout.write(JSON.stringify(result));
  if (didError) process.exit(1);
};
