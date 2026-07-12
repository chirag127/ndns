// security — /security obj + /security/tlds array.

import { NextDnsClient } from "../client.ts";
import { getApiKey } from "../util/env.ts";
import { printError, printJson, printSuccess } from "../util/fmt.ts";
import { parseArgs, toBool } from "../args.ts";

const BOOL_FIELDS = [
  "threatIntelligenceFeeds",
  "aiThreatDetection",
  "googleSafeBrowsing",
  "cryptojacking",
  "dnsRebinding",
  "idnHomographs",
  "typosquatting",
  "dga",
  "nrd",
  "ddns",
  "parking",
  "csam",
];

export async function security(args: string[]): Promise<void> {
  const sub = args[0];
  const rest = args.slice(1);
  const client = new NextDnsClient(getApiKey());

  if (sub === "show") {
    const profile = rest[0];
    if (!profile) return printError("security show <profile>");
    printJson(await client.getSecurity(profile));
    return;
  }

  if (sub === "set") {
    const profile = rest[0];
    if (!profile) return printError("security set <profile> --<field>=<value> ...");
    const spec: { string: string[]; boolean: string[] } = {
      string: ["tlds"],
      boolean: [...BOOL_FIELDS],
    };
    const opts = parseArgs(rest.slice(1), spec);
    const body: Record<string, unknown> = {};
    for (const f of BOOL_FIELDS) {
      const v = toBool(opts.values[f]);
      if (v !== undefined) body[f] = v;
    }
    if (opts.values.tlds !== undefined) {
      // comma list -> [{id}]
      body.tlds = String(opts.values.tlds)
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean)
        .map((id) => ({ id }));
    }
    if (Object.keys(body).length === 0) {
      return printError("no changes; pass one or more --<field>=<value>");
    }
    await client.patchSecurity(profile, body);
    printSuccess("security updated");
    return;
  }

  if (sub === "tld") {
    const action = rest[0];
    const profile = rest[1];
    const tld = rest[2];
    if (action === "list") {
      if (!profile) return printError("security tld list <profile>");
      const rows = await client.listSecurityTlds(profile);
      for (const r of rows) console.log(r.id);
      return;
    }
    if (action === "add") {
      if (!profile || !tld) return printError("security tld add <profile> <tld>");
      await client.addSecurityTld(profile, tld);
      printSuccess(`added tld ${tld}`);
      return;
    }
    if (action === "remove") {
      if (!profile || !tld) return printError("security tld remove <profile> <tld>");
      await client.removeSecurityTld(profile, tld);
      printSuccess(`removed tld ${tld}`);
      return;
    }
    return printError("security tld <list|add|remove> ...");
  }

  printError(`unknown: security ${sub ?? ""}. Try: show, set, tld`);
}
