import { gql } from "graphql-request";

export const hubQuery = gql`
  query HubInfo($slug: String!, $page: Int = 1, $perPage: Int = 10) {
    hub(slug: $slug) {
      id
      slug
      name
      tournaments(
        query: { page: $page, perPage: $perPage, sortBy: "startAt DESC" }
      ) {
        nodes {
          id
          name
          slug
        }
      }
    }
  }
`;
