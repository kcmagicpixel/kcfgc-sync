import { GGHubSchema, loadHub } from "@emily-curry/fgc-sync-common";
import { z } from "zod";

export const loadHubs = async (apiKey: string, hubIds: string[]) => {
  let didError = false;
  const result: Array<z.infer<typeof GGHubSchema>> = [];

  for (const hubId of hubIds) {
    try {
      const parsed = await loadHub(hubId);
      result.push(parsed);
    } catch (e) {
      console.error(`[${hubId}]`, e);
      didError = true;
    }
  }

  process.stdout.write(JSON.stringify(result));
  if (didError) process.exit(1);
};
