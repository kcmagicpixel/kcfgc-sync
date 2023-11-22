export const GQL_ENDPOINT = "https://api.start.gg/gql/alpha";
export const GQL_ENDPOINT_ALT = "https://www.start.gg/api/-/gql";
export const infoEndpoint = (id: string, dataId: string) =>
  `https://www.start.gg/_next/data/${dataId}/en-us/tournament/${id}/dashboard.json`;

/**
 * start.gg uses some kind of versioning strategy for some important files. This attempts to figure out what the latest version of those files are.
 */
export const fetchDataId = async () => {
  const homeResponse = await (await fetch("https://start.gg")).text();
  const dataId = /<script src="\/assets.*\/(.*?)\/_buildManifest\.js/gim.exec(
    homeResponse
  )?.[1];
  if (!dataId) throw new Error("Could not parse dataId from home page!");
  return dataId;
};

export const withRetry = <T extends any[], R>(
  fn: (...args: T) => Promise<R>,
  count: number = 3,
  throttle: number = 1000
): ((...args: T) => Promise<R>) => {
  return async (...args: T) => {
    let retryCount = 0;
    while (true) {
      try {
        return await fn(...args);
      } catch (e) {
        retryCount += 1;
        if (retryCount >= count) throw e;
        await new Promise((res) => setTimeout(res, throttle));
      }
    }
  };
};
