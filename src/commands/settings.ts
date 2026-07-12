// settings — /settings + /settings/logs + /settings/blockPage + /settings/performance.

import { NextDnsClient } from "../client.ts";
import { getApiKey } from "../util/env.ts";
import { printError, printJson, printSuccess } from "../util/fmt.ts";
import { parseArgs, toBool } from "../args.ts";

export async function settings(args: string[]): Promise<void> {
  const sub = args[0];
  const rest = args.slice(1);
  const client = new NextDnsClient(getApiKey());

  if (sub === "show") {
    const profile = rest[0];
    if (!profile) return printError("settings show <profile>");
    printJson(await client.getSettings(profile));
    return;
  }

  if (sub === "logs") {
    const action = rest[0];
    const profile = rest[1];
    if (action === "show") {
      if (!profile) return printError("settings logs show <profile>");
      printJson(await client.getSettingsLogs(profile));
      return;
    }
    if (action === "set") {
      if (!profile) {
        return printError(
          "settings logs set <profile> [--enabled=<b>] [--retention=<hours>] [--location=<eu|us|ch|gb|de|sg>] [--drop-ip=<b>] [--drop-domain=<b>]",
        );
      }
      const opts = parseArgs(rest.slice(2), {
        boolean: ["enabled", "drop-ip", "drop-domain"],
        string: ["retention", "location"],
      });
      const body: Record<string, unknown> = {};
      const en = toBool(opts.values.enabled);
      if (en !== undefined) body.enabled = en;
      if (opts.values.retention !== undefined) {
        body.retention = parseInt(String(opts.values.retention), 10);
      }
      if (opts.values.location !== undefined) body.location = opts.values.location;
      const drop: Record<string, unknown> = {};
      const dip = toBool(opts.values["drop-ip"]);
      const ddom = toBool(opts.values["drop-domain"]);
      if (dip !== undefined) drop.ip = dip;
      if (ddom !== undefined) drop.domain = ddom;
      if (Object.keys(drop).length > 0) body.drop = drop;
      if (Object.keys(body).length === 0) return printError("no changes");
      await client.patchSettingsLogs(profile, body);
      printSuccess("logs settings updated");
      return;
    }
    return printError("settings logs <show|set>");
  }

  if (sub === "blockpage") {
    const action = rest[0];
    const profile = rest[1];
    if (action === "show") {
      if (!profile) return printError("settings blockpage show <profile>");
      printJson(await client.getSettingsBlockPage(profile));
      return;
    }
    if (action === "set") {
      if (!profile) return printError("settings blockpage set <profile> --enabled=<bool>");
      const opts = parseArgs(rest.slice(2), { boolean: ["enabled"] });
      const body: Record<string, unknown> = {};
      const en = toBool(opts.values.enabled);
      if (en !== undefined) body.enabled = en;
      if (Object.keys(body).length === 0) return printError("no changes");
      await client.patchSettingsBlockPage(profile, body);
      printSuccess("blockpage updated");
      return;
    }
    return printError("settings blockpage <show|set>");
  }

  if (sub === "performance") {
    const action = rest[0];
    const profile = rest[1];
    if (action === "show") {
      if (!profile) return printError("settings performance show <profile>");
      printJson(await client.getSettingsPerformance(profile));
      return;
    }
    if (action === "set") {
      if (!profile) {
        return printError(
          "settings performance set <profile> [--ecs=<b>] [--cache-boost=<b>] [--cname-flattening=<b>]",
        );
      }
      const opts = parseArgs(rest.slice(2), {
        boolean: ["ecs", "cache-boost", "cname-flattening"],
      });
      const body: Record<string, unknown> = {};
      const ecs = toBool(opts.values.ecs);
      const cb = toBool(opts.values["cache-boost"]);
      const cf = toBool(opts.values["cname-flattening"]);
      if (ecs !== undefined) body.ecs = ecs;
      if (cb !== undefined) body.cacheBoost = cb;
      if (cf !== undefined) body.cnameFlattening = cf;
      if (Object.keys(body).length === 0) return printError("no changes");
      await client.patchSettingsPerformance(profile, body);
      printSuccess("performance updated");
      return;
    }
    return printError("settings performance <show|set>");
  }

  printError(`unknown: settings ${sub ?? ""}. Try: show, logs, blockpage, performance`);
}
