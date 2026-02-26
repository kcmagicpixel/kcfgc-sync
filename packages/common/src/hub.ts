import { request } from "graphql-request";
import { GQL_ENDPOINT_ALT, withRetry } from "./util.js";
import { hubQuery } from "./query/hub-query.js";
import { GGHubSchema } from "./schema.js";

export const loadHub = withRetry(async (hubId: string) => {
  const { hub }: any = await request(
    GQL_ENDPOINT_ALT,
    hubQuery,
    {
      slug: `hub/${hubId}`,
      perPage: 20,
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
