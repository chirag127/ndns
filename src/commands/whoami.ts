// whoami — verifies API key by listing profiles.

import { NextDnsClient, NextDnsApiError } from "../client.ts";
import { getApiKey, exit } from "../util/env.ts";

export async function whoami(_args: string[]): Promise<void> {
  const key = getApiKey();
  const client = new NextDnsClient(key);
  try {
    const profiles = await client.listProfiles();
    console.log(`OK. ${profiles.length} profile(s):`);
    for (const p of profiles) {
      console.log(`  ${p.id}${p.name ? "  " + p.name : ""}`);
    }
  } catch (e) {
    if (e instanceof NextDnsApiError && e.status === 401) {
      console.error("error: invalid API key.");
      console.error("Get a new one at https://my.nextdns.io/account");
      exit(1);
    }
    throw e;
  }
}
