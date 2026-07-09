#!/usr/bin/env -S deno run --allow-net --allow-env --allow-read --allow-write
// ndns — complete NextDNS account CLI.
// Deno + Bun single-file entry.

import { whoami } from "./commands/whoami.ts";
import { profile } from "./commands/profile.ts";
import { denylist, allowlist } from "./commands/denylist.ts";
import { blocklist } from "./commands/blocklist.ts";
import { native } from "./commands/native.ts";
import { security } from "./commands/security.ts";
import { parental } from "./commands/parental.ts";
import { privacy } from "./commands/privacy.ts";
import { settings } from "./commands/settings.ts";
import { analytics } from "./commands/analytics.ts";
import { logs } from "./commands/logs.ts";
import { config } from "./commands/config.ts";
import { NextDnsApiError } from "./client.ts";
import { exit } from "./util/env.ts";

const VERSION = "0.1.0";

const HELP = `ndns — complete NextDNS account CLI

Usage: ndns <command> [subcommand] [args]

Commands:
  whoami                          Verify API key
  profile <list|show|create|update|delete>
  denylist <list|add|remove|toggle-active|bulk-add|bulk-remove|export|import>
  allowlist <list|add|remove|toggle-active|bulk-add|bulk-remove|export|import>
  blocklist <list-available|list|subscribe|unsubscribe>
  native <list|add|remove>
  security <show|set|tld>
  parental <show|safe-search|youtube-restricted|block-bypass|services|categories>
  privacy <show|set>
  settings <show|logs|blockpage|performance>
  analytics <resource> <profile>  status|domains|reasons|ips|devices|protocols|
                                  queryTypes|ipVersions|dnssec|encryption|destinations
  logs <list|stream|download|clear>
  config <export|import>
  version                         Print version
  help                            Show this help

Auth: set NEXTDNS_API_KEY env var. Get key at https://my.nextdns.io/account

Docs: https://github.com/chirag127/ndns
API:  https://nextdns.github.io/api  (BETA — subject to change)
`;

// deno-lint-ignore no-explicit-any
const g = globalThis as any;

function getArgv(): string[] {
  if (g.Deno?.args) return g.Deno.args as string[];
  if (g.process?.argv) return (g.process.argv as string[]).slice(2);
  return [];
}

async function main(): Promise<void> {
  const argv = getArgv();
  const cmd = argv[0];
  const rest = argv.slice(1);

  if (!cmd || cmd === "help" || cmd === "--help" || cmd === "-h") {
    console.log(HELP);
    return;
  }
  if (cmd === "version" || cmd === "--version" || cmd === "-v") {
    console.log(`ndns ${VERSION}`);
    return;
  }

  const table: Record<string, (a: string[]) => Promise<void>> = {
    whoami,
    profile,
    denylist,
    allowlist,
    blocklist,
    native,
    security,
    parental,
    privacy,
    settings,
    analytics,
    logs,
    config,
  };

  const fn = table[cmd];
  if (!fn) {
    console.error(`error: unknown command '${cmd}'`);
    console.error("");
    console.error(HELP);
    exit(1);
  }

  try {
    await fn(rest);
  } catch (e) {
    if (e instanceof NextDnsApiError) {
      console.error(`error: API ${e.status}`);
      for (const err of e.errors) {
        console.error(`  ${err.code}${err.detail ? ": " + err.detail : ""}`);
      }
      exit(1);
    }
    if (e instanceof Error) {
      console.error(`error: ${e.message}`);
      exit(1);
    }
    console.error(`error: ${String(e)}`);
    exit(1);
  }
}

// Kick off. Works under Deno (top-level await) and Bun (async main call).
main().catch((e) => {
  console.error(e);
  exit(1);
});
