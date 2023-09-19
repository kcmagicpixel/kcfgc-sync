import { gql } from "graphql-request";
import { tournamentFragment } from "./tournament-fragment";

export const tournamentQuery = gql`
  query TournamentQuery($slug: String) {
    tournament(slug: $slug) {
      ...tournamentFragment
    }
  }
  ${tournamentFragment}
`;
