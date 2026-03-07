import { request } from "graphql-request";
import { GQL_ENDPOINT_ALT, withRetry } from "./util.js";
import { hubQuery } from "./query/hub-query.js";
import { GGHubSchema } from "./schema.js";

const PER_PAGE = 20;

const fetchPage = async (hubId: string, page: number) => {
  const { hub }: any = await request(
    GQL_ENDPOINT_ALT,
    hubQuery,
    {
      slug: `hub/${hubId}`,
      page,
      perPage: PER_PAGE,
    },
    { ["client-version"]: "20" }
  );
  return hub;
};

export const loadHub = withRetry(async (hubId: string, limit?: number) => {
  const hub = await fetchPage(hubId, 1);
  const allNodes: any[] = [...(hub.tournaments?.nodes ?? [])];

  if (limit != null) {
    let page = 2;
    while (allNodes.length < limit) {
      const next = await fetchPage(hubId, page);
      const nodes: any[] = next.tournaments?.nodes ?? [];
      if (nodes.length === 0) break;
      allNodes.push(...nodes);
      page++;
    }
  }

  const tournaments = (limit != null ? allNodes.slice(0, limit) : allNodes).map(
    (tournament: any) => ({
      id: tournament.id,
      name: tournament.name,
      slug: tournament.slug.replace(/^.*\//gi, ""),
    })
  );

  return GGHubSchema.parse({
    id: hub.id,
    name: hub.name,
    slug: hub.slug.replace(/^.*\//gi, ""),
    tournaments,
  });
});
