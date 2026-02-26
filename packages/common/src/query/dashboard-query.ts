import { gql } from "graphql-request";

export const dashboardQuery = gql`
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
