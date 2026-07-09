// profile — list/show/create/update/delete

import { NextDnsClient } from "../client.ts";
import { getApiKey } from "../util/env.ts";
import { formatOutput, printJson, printSuccess, printError, OutputFormat } from "../util/fmt.ts";
import { parseArgs } from "../args.ts";

export async function profile(args: string[]): Promise<void> {
  const sub = args[0];
  const rest = args.slice(1);
  const client = new NextDnsClient(getApiKey());

  if (sub === "list") {
    const opts = parseArgs(rest, { string: ["output"] });
    const output = (opts.values.output as OutputFormat) || "table";
    const rows = await client.listProfiles();
    if (output === "json") {
      printJson(rows);
    } else {
      console.log(
        formatOutput(
          rows.map((r) => ({ id: r.id, name: r.name ?? "", fingerprint: r.fingerprint ?? "" })),
          output,
        ),
      );
    }
    return;
  }

  if (sub === "show") {
    const id = rest[0];
    if (!id) { printError("profile show <id>"); return; }
    const p = await client.getProfile(id);
    printJson(p);
    return;
  }

  if (sub === "create") {
    const opts = parseArgs(rest, { string: ["name", "from-file"] });
    let body: Record<string, unknown> = {};
    if (opts.values["from-file"]) {
      const path = String(opts.values["from-file"]);
      const text = await readFileText(path);
      body = JSON.parse(text);
    }
    if (opts.values.name) body.name = opts.values.name;
    const res = await client.createProfile(body);
    printSuccess(`created profile ${res.id}`);
    return;
  }

  if (sub === "update") {
    const id = rest[0];
    if (!id) { printError("profile update <id> --from-file body.json"); return; }
    const opts = parseArgs(rest.slice(1), { string: ["name", "from-file"] });
    let body: Record<string, unknown> = {};
    if (opts.values["from-file"]) {
      const text = await readFileText(String(opts.values["from-file"]));
      body = JSON.parse(text);
    }
    if (opts.values.name) body.name = opts.values.name;
    await client.updateProfile(id, body);
    printSuccess(`updated ${id}`);
    return;
  }

  if (sub === "delete") {
    const id = rest[0];
    if (!id) { printError("profile delete <id>"); return; }
    await client.deleteProfile(id);
    printSuccess(`deleted ${id}`);
    return;
  }

  printError(`unknown: profile ${sub ?? ""}. Try: list, show, create, update, delete`);
}

async function readFileText(path: string): Promise<string> {
  // deno-lint-ignore no-explicit-any
  const g = globalThis as any;
  if (g.Deno?.readTextFile) return await g.Deno.readTextFile(path);
  const fs = await import("node:fs/promises");
  return await fs.readFile(path, "utf8");
}
