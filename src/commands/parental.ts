// parental — /parentalControl obj + services + categories.

import { NextDnsClient } from "../client.ts";
import { getApiKey } from "../util/env.ts";
import { formatOutput, printJson, printSuccess, printError, OutputFormat } from "../util/fmt.ts";
import { parseArgs, toBool } from "../args.ts";

export async function parental(args: string[]): Promise<void> {
  const sub = args[0];
  const rest = args.slice(1);
  const client = new NextDnsClient(getApiKey());

  if (sub === "show") {
    const profile = rest[0];
    if (!profile) return printError("parental show <profile>");
    printJson(await client.getParentalControl(profile));
    return;
  }

  if (sub === "safe-search") {
    const profile = rest[0];
    const state = toBool(rest[1]);
    if (!profile || state === undefined) return printError("parental safe-search <profile> <on|off>");
    await client.patchParentalControl(profile, { safeSearch: state });
    printSuccess(`safeSearch=${state}`);
    return;
  }

  if (sub === "youtube-restricted") {
    const profile = rest[0];
    const state = toBool(rest[1]);
    if (!profile || state === undefined) return printError("parental youtube-restricted <profile> <on|off>");
    await client.patchParentalControl(profile, { youtubeRestrictedMode: state });
    printSuccess(`youtubeRestrictedMode=${state}`);
    return;
  }

  if (sub === "block-bypass") {
    const profile = rest[0];
    const state = toBool(rest[1]);
    if (!profile || state === undefined) return printError("parental block-bypass <profile> <on|off>");
    await client.patchParentalControl(profile, { blockBypass: state });
    printSuccess(`blockBypass=${state}`);
    return;
  }

  if (sub === "services") {
    const action = rest[0];
    const profile = rest[1];
    if (action === "list") {
      if (!profile) return printError("parental services list <profile>");
      const opts = parseArgs(rest.slice(2), { string: ["output"] });
      const output = (opts.values.output as OutputFormat) || "table";
      const rows = await client.listParentalServices(profile);
      if (output === "json") printJson(rows);
      else console.log(formatOutput(rows.map((r) => ({ id: r.id, active: r.active })), output));
      return;
    }
    if (action === "toggle") {
      const svc = rest[2];
      const state = toBool(rest[3]);
      if (!profile || !svc || state === undefined) return printError("parental services toggle <profile> <service> <on|off>");
      // Try patch, fallback to add
      try { await client.patchParentalService(profile, svc, state); }
      catch { await client.addParentalService(profile, svc, state); }
      printSuccess(`${svc}=${state}`);
      return;
    }
    if (action === "add") {
      const svc = rest[2];
      if (!profile || !svc) return printError("parental services add <profile> <service>");
      await client.addParentalService(profile, svc, true);
      printSuccess(`added ${svc}`);
      return;
    }
    if (action === "remove") {
      const svc = rest[2];
      if (!profile || !svc) return printError("parental services remove <profile> <service>");
      await client.removeParentalService(profile, svc);
      printSuccess(`removed ${svc}`);
      return;
    }
    return printError("parental services <list|toggle|add|remove>");
  }

  if (sub === "categories") {
    const action = rest[0];
    const profile = rest[1];
    if (action === "list") {
      if (!profile) return printError("parental categories list <profile>");
      const rows = await client.listParentalCategories(profile);
      console.log(formatOutput(rows.map((r) => ({ id: r.id, active: r.active })), "table"));
      return;
    }
    if (action === "toggle") {
      const cat = rest[2];
      const state = toBool(rest[3]);
      if (!profile || !cat || state === undefined) return printError("parental categories toggle <profile> <cat> <on|off>");
      try { await client.patchParentalCategory(profile, cat, state); }
      catch { await client.addParentalCategory(profile, cat, state); }
      printSuccess(`${cat}=${state}`);
      return;
    }
    return printError("parental categories <list|toggle>");
  }

  printError(`unknown: parental ${sub ?? ""}. Try: show, safe-search, youtube-restricted, block-bypass, services, categories`);
}
