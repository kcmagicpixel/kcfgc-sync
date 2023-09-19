import { gql } from "graphql-request";

export const hubQuery = gql`
  query HubInfo($slug: String!) {
    hub(slug: $slug) {
      id
      slug
      name
      tournaments(query: { page: 1, perPage: 10, sortBy: "startAt DESC" }) {
        nodes {
          id
          name
          slug
        }
      }
    }
  }
`;
