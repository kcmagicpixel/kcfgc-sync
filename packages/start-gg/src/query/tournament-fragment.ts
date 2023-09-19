import { gql } from "graphql-request";

export const tournamentFragment = gql`
  fragment tournamentFragment on Tournament {
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
      rulesMarkdown
      startAt
      competitionTier
      publishing
      videogame {
        id
        name
        images {
          id
          height
          ratio
          type
          url
          width
        }
      }
      standings(query: { page: 1, perPage: 3 }) {
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
`;
