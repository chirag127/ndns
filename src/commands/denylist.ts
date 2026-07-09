// denylist commands.

import { NextDnsClient } from "../client.ts";
import { getApiKey } from "../util/env.ts";
import { formatOutput, printJson, printSuccess, printError, OutputFormat } from "../util/fmt.ts";
import { parseArgs, toBool } from "../args.ts";
import { bulkAdd, readLines } from "./list-helpers.ts";

export async function denylist(args: string[]): Promise<void> {
  await listCmd(args, "denylist");
}

export async function allowlist(args: string[]): Promise<void> {
  await listCmd(args, "allowlist");
}

async function listCmd(args: string[], kind: "denylist" | "allowlist"): Promise<void> {
  const sub = args[0];
  const rest = args.slice(1);
  const client = new NextDnsClient(getApiKey());

  if (sub === "list") {
    const profile = rest[0];
    if (!profile) return printError(`${kind} list <profile>`);
    const opts = parseArgs(rest.slice(1), { string: ["output"] });
    const output = (opts.values.output as OutputFormat) || "table";
    const rows = kind === "denylist"
      ? await client.listDenylist(profile)
      : await client.listAllowlist(profile);
    if (output === "json") printJson(rows);
    else console.log(formatOutput(rows.map((r) => ({ domain: r.id, active: r.active })), output));
    return;
  }

  if (sub === "add") {
    const profile = rest[0];
    const domain = rest[1];
    if (!profile || !domain) return printError(`${kind} add <profile> <domain>`);
    if (kind === "denylist") await client.addDenylist(profile, domain, true);
    else await client.addAllowlist(profile, domain, true);
    printSuccess(`added ${domain}`);
    return;
  }

  if (sub === "remove") {
    const profile = rest[0];
    const domain = rest[1];
    if (!profile || !domain) return printError(`${kind} remove <profile> <domain>`);
    if (kind === "denylist") await client.removeDenylist(profile, domain);
    else await client.removeAllowlist(profile, domain);
    printSuccess(`removed ${domain}`);
    return;
  }

  if (sub === "toggle-active") {
    const profile = rest[0];
    const domain = rest[1];
    const activeArg = rest[2];
    if (!profile || !domain || activeArg === undefined) {
      return printError(`${kind} toggle-active <profile> <domain> <true|false>`);
    }
    const active = toBool(activeArg) ?? true;
    if (kind === "denylist") await client.patchDenylist(profile, domain, active);
    else await client.patchAllowlist(profile, domain, active);
    printSuccess(`${domain} active=${active}`);
    return;
  }

  if (sub === "bulk-add") {
    const profile = rest[0];
    if (!profile) return printError(`${kind} bulk-add <profile> --from-file <path> | --stdin`);
    const opts = parseArgs(rest.slice(1), { string: ["from-file", "concurrency"], boolean: ["stdin"] });
    const domains = await readLines({
      file: opts.values["from-file"] as string | undefined,
      stdin: opts.values.stdin as boolean | undefined,
    });
    if (domains.length === 0) return printError("no domains found in input");
    const concurrency = parseInt(String(opts.values.concurrency ?? "5"), 10) || 5;
    let lastPct = -1;
    const res = await bulkAdd(client, kind, profile, domains, concurrency, (done, total) => {
      const pct = Math.floor((done / total) * 100);
      if (pct !== lastPct) {
        lastPct = pct;
        // deno-lint-ignore no-explicit-any
        const g = globalThis as any;
        const out = g.Deno?.stdout ?? g.process?.stdout;
        const line = `\radding ${done}/${total} (${pct}%)`;
        if (out?.writeSync && g.Deno) out.writeSync(new TextEncoder().encode(line));
        else if (out?.write) out.write(line);
      }
    });
    console.log("");
    printSuccess(`${res.added} added, ${res.existed} already existed, ${res.failed.length} failed`);
    if (res.failed.length > 0) {
      console.log("failures:");
      for (const f of res.failed.slice(0, 20)) console.log(`  ${f.domain}: ${f.error}`);
      if (res.failed.length > 20) console.log(`  ... and ${res.failed.length - 20} more`);
    }
    return;
  }

  if (sub === "bulk-remove") {
    const profile = rest[0];
    if (!profile) return printError(`${kind} bulk-remove <profile> --from-file <path> | --stdin`);
    const opts = parseArgs(rest.slice(1), { string: ["from-file"], boolean: ["stdin"] });
    const domains = await readLines({
      file: opts.values["from-file"] as string | undefined,
      stdin: opts.values.stdin as boolean | undefined,
    });
    let removed = 0, failed = 0;
    for (const d of domains) {
      try {
        if (kind === "denylist") await client.removeDenylist(profile, d);
        else await client.removeAllowlist(profile, d);
        removed++;
      } catch { failed++; }
    }
    printSuccess(`${removed} removed, ${failed} failed`);
    return;
  }

  if (sub === "export") {
    const profile = rest[0];
    if (!profile) return printError(`${kind} export <profile>`);
    const rows = kind === "denylist" ? await client.listDenylist(profile) : await client.listAllowlist(profile);
    for (const r of rows) console.log(r.id);
    return;
  }

  if (sub === "import") {
    // Alias for bulk-add
    await listCmd(["bulk-add", ...rest], kind);
    return;
  }

  printError(`unknown: ${kind} ${sub ?? ""}. Try: list, add, remove, toggle-active, bulk-add, bulk-remove, export, import`);
}
