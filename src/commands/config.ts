// config — export/import full profile JSON.

import { NextDnsClient } from "../client.ts";
import { getApiKey } from "../util/env.ts";
import { printError, printJson, printSuccess } from "../util/fmt.ts";
import { parseArgs } from "../args.ts";

export async function config(args: string[]): Promise<void> {
  const sub = args[0];
  const rest = args.slice(1);
  const client = new NextDnsClient(getApiKey());

  if (sub === "export") {
    const profile = rest[0];
    if (!profile) return printError("config export <profile>");
    const opts = parseArgs(rest.slice(1), { string: ["out"] });
    const data = await client.getProfile(profile);
    if (opts.values.out) {
      await writeFile(String(opts.values.out), JSON.stringify(data, null, 2));
      printSuccess(`wrote ${opts.values.out}`);
    } else {
      printJson(data);
    }
    return;
  }

  if (sub === "import") {
    // ndns config import [<target-profile>] --from-file profile.json [--mode=merge|replace]
    const opts = parseArgs(rest, { string: ["from-file", "mode", "target"] });
    const modeStr = String(opts.values.mode ?? "merge").toLowerCase();
    const mode = modeStr === "replace" ? "replace" : "merge";
    const path = opts.values["from-file"] as string | undefined;
    if (!path) {
      return printError("config import [<profile>] --from-file <path> [--mode=merge|replace]");
    }
    const text = await readFile(path);
    const body = JSON.parse(text);

    const target = (opts.values.target as string | undefined) ?? opts.positionals[0];

    if (!target) {
      // create new profile
      const res = await client.createProfile(body);
      printSuccess(`created profile ${res.id}`);
      return;
    }

    if (mode === "replace") {
      // PATCH with full body — NextDNS PATCH is partial-update; a true "replace" requires
      // stripping deprecated fields. We do a plain PATCH which effectively upserts every field
      // passed. For array sub-resources use per-endpoint replace instead.
      await client.updateProfile(target, body);
      printSuccess(`replaced ${target} (via PATCH on full body)`);
      return;
    }

    // merge: shallow-merge top-level keys we recognize
    await client.updateProfile(target, body);
    printSuccess(`merged into ${target}`);
    return;
  }

  printError(`unknown: config ${sub ?? ""}. Try: export, import`);
}

async function readFile(path: string): Promise<string> {
  // deno-lint-ignore no-explicit-any
  const g = globalThis as any;
  if (g.Deno?.readTextFile) return await g.Deno.readTextFile(path);
  const fs = await import("node:fs/promises");
  return await fs.readFile(path, "utf8");
}

async function writeFile(path: string, text: string): Promise<void> {
  // deno-lint-ignore no-explicit-any
  const g = globalThis as any;
  if (g.Deno?.writeTextFile) return await g.Deno.writeTextFile(path, text);
  const fs = await import("node:fs/promises");
  await fs.writeFile(path, text, "utf8");
}
