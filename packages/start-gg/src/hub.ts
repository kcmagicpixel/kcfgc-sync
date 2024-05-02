import { GGHubSchema } from "@emily-curry/fgc-sync-common";
import { request } from "graphql-request";
import { z } from "zod";
import { GQL_ENDPOINT_ALT, withRetry } from "./util";
import { hubQuery } from "./query/hub-query";

const loadHub = withRetry(async (hubId: string) => {
  const { hub }: any = await request(
    GQL_ENDPOINT_ALT,
    hubQuery,
    {
      slug: `hub/${hubId}`,
      perPage: 500,
    },
    { ["client-version"]: "20" }
  );
  const parsed = GGHubSchema.parse({
    id: hub.id,
    name: hub.name,
    slug: hub.slug.replace(/^.*\//gi, ""),
    tournaments: hub.tournaments?.nodes?.map((tournament: any) => {
      return {
        id: tournament.id,
        name: tournament.name,
        slug: tournament.slug.replace(/^.*\//gi, ""),
      };
    }),
  });
  return parsed;
});

export const loadHubs = async (apiKey: string, hubIds: string[]) => {
  let didError = false;
  const result: Array<z.infer<typeof GGHubSchema>> = [];

  for (const hubId of hubIds) {
    try {
      const parsed = await loadHub(hubId);
      result.push(parsed);
    } catch (e) {
      process.stderr.write((e as any)?.toString());
      didError = true;
    }
  }

  process.stdout.write(JSON.stringify(result));
  if (didError) process.exit(1);
};
