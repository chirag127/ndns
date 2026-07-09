// blocklist commands. NextDNS API doesn't expose a discovery endpoint for
// available blocklists — the curated catalog lives on their marketing site.
// We hardcode a common set for `list-available`; users can subscribe by ID
// (the ID is the URL slug on my.nextdns.io/{profile}/privacy).

import { NextDnsClient } from "../client.ts";
import { getApiKey } from "../util/env.ts";
import { formatOutput, printJson, printSuccess, printError, OutputFormat } from "../util/fmt.ts";
import { parseArgs } from "../args.ts";

const CURATED: Array<{ id: string; name: string }> = [
  { id: "nextdns-recommended", name: "NextDNS Ads & Trackers Blocklist (recommended)" },
  { id: "oisd-full", name: "OISD Big" },
  { id: "oisd-small", name: "OISD Small" },
  { id: "1hosts-lite", name: "1Hosts (Lite)" },
  { id: "1hosts-pro", name: "1Hosts (Pro)" },
  { id: "adguard-dns-filter", name: "AdGuard DNS filter" },
  { id: "adaway", name: "AdAway" },
  { id: "easylist", name: "EasyList" },
  { id: "easyprivacy", name: "EasyPrivacy" },
  { id: "hagezi-multi-light", name: "hagezi Multi LIGHT" },
  { id: "hagezi-multi-pro", name: "hagezi Multi PRO" },
  { id: "hagezi-multi-ultimate", name: "hagezi Multi Ultimate" },
  { id: "goodbye-ads", name: "Goodbye Ads" },
  { id: "steven-black-hosts", name: "Steven Black Unified Hosts" },
];

export async function blocklist(args: string[]): Promise<void> {
  const sub = args[0];
  const rest = args.slice(1);

  if (sub === "list-available") {
    const opts = parseArgs(rest, { string: ["output"] });
    const output = (opts.values.output as OutputFormat) || "table";
    if (output === "json") printJson(CURATED);
    else console.log(formatOutput(CURATED, output));
    console.log("");
    console.log("Note: this is a curated subset. Full catalog on my.nextdns.io/<profile>/privacy.");
    return;
  }

  const client = new NextDnsClient(getApiKey());

  if (sub === "list") {
    const profile = rest[0];
    if (!profile) return printError("blocklist list <profile>");
    const opts = parseArgs(rest.slice(1), { string: ["output"] });
    const output = (opts.values.output as OutputFormat) || "table";
    const rows = await client.listBlocklists(profile);
    if (output === "json") printJson(rows);
    else console.log(formatOutput(rows.map((r) => ({ id: r.id })), output));
    return;
  }

  if (sub === "subscribe") {
    const profile = rest[0];
    const id = rest[1];
    if (!profile || !id) return printError("blocklist subscribe <profile> <id>");
    await client.addBlocklist(profile, id);
    printSuccess(`subscribed ${id}`);
    return;
  }

  if (sub === "unsubscribe") {
    const profile = rest[0];
    const id = rest[1];
    if (!profile || !id) return printError("blocklist unsubscribe <profile> <id>");
    await client.removeBlocklist(profile, id);
    printSuccess(`unsubscribed ${id}`);
    return;
  }

  printError(`unknown: blocklist ${sub ?? ""}. Try: list-available, list, subscribe, unsubscribe`);
}
