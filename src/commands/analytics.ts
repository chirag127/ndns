// analytics — 11 endpoints, all support --series time-series suffix.

import { NextDnsClient } from "../client.ts";
import { getApiKey } from "../util/env.ts";
import { printJson, printError } from "../util/fmt.ts";
import { parseArgs } from "../args.ts";
import { normalizeDate, intervalToSeconds } from "../util/date.ts";

const RESOURCES = [
  "status",
  "domains",
  "reasons",
  "ips",
  "devices",
  "protocols",
  "queryTypes",
  "ipVersions",
  "dnssec",
  "encryption",
  "destinations",
];

export async function analytics(args: string[]): Promise<void> {
  const resource = args[0];
  const profile = args[1];
  const rest = args.slice(2);

  if (!resource || resource === "help" || resource === "--help") {
    console.log("Usage: ndns analytics <resource> <profile> [flags]");
    console.log("Resources:");
    for (const r of RESOURCES) console.log(`  ${r}`);
    console.log("Flags: --from=<date> --to=<date> --limit=<n> --device=<id> --status=<s> --root=<b> --type=<t>");
    console.log("Time-series: --series --interval=<seconds|1d|1h> --alignment=<start|end|clock> --timezone=<IANA>");
    console.log("Output: --output=<json|table>");
    return;
  }

  if (!RESOURCES.includes(resource)) return printError(`unknown resource '${resource}'. Try: ${RESOURCES.join(", ")}`);
  if (!profile) return printError(`analytics ${resource} <profile>`);

  const opts = parseArgs(rest, {
    string: ["from", "to", "limit", "device", "status", "type", "interval", "alignment", "timezone", "partials", "output"],
    boolean: ["series", "root"],
  });

  const client = new NextDnsClient(getApiKey());
  const query: Record<string, string | number | boolean | undefined> = {};
  const from = normalizeDate(opts.values.from as string | undefined);
  const to = normalizeDate(opts.values.to as string | undefined);
  if (from) query.from = from;
  if (to) query.to = to;
  if (opts.values.limit) query.limit = String(opts.values.limit);
  if (opts.values.device) query.device = String(opts.values.device);
  if (opts.values.status) query.status = String(opts.values.status);
  if (opts.values.type) query.type = String(opts.values.type);
  if (opts.values.root !== undefined) query.root = Boolean(opts.values.root);

  const series = Boolean(opts.values.series);
  if (series) {
    if (opts.values.interval) {
      const iv = String(opts.values.interval);
      const secs = /^\d+$/.test(iv) ? parseInt(iv, 10) : intervalToSeconds(iv);
      query.interval = secs;
    }
    if (opts.values.alignment) query.alignment = String(opts.values.alignment);
    if (opts.values.timezone) query.timezone = String(opts.values.timezone);
    if (opts.values.partials) query.partials = String(opts.values.partials);
  }

  const env = await client.analyticsRaw(profile, resource, series, query);
  const output = String(opts.values.output ?? "json");
  if (output === "json") {
    printJson(env);
  } else {
    // table fallback
    if (Array.isArray(env.data)) printJson(env.data);
    else printJson(env);
  }
}
