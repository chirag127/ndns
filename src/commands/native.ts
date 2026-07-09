// native — privacy/natives sub-resource (Apple, Google, etc. native tracker blocklists).

import { NextDnsClient } from "../client.ts";
import { getApiKey } from "../util/env.ts";
import { formatOutput, printJson, printSuccess, printError, OutputFormat } from "../util/fmt.ts";
import { parseArgs } from "../args.ts";

export async function native(args: string[]): Promise<void> {
  const sub = args[0];
  const rest = args.slice(1);
  const client = new NextDnsClient(getApiKey());

  if (sub === "list") {
    const profile = rest[0];
    if (!profile) return printError("native list <profile>");
    const opts = parseArgs(rest.slice(1), { string: ["output"] });
    const output = (opts.values.output as OutputFormat) || "table";
    const rows = await client.listNatives(profile);
    if (output === "json") printJson(rows);
    else console.log(formatOutput(rows.map((r) => ({ id: r.id })), output));
    return;
  }

  if (sub === "add") {
    const profile = rest[0];
    const id = rest[1];
    if (!profile || !id) return printError("native add <profile> <id>");
    await client.addNative(profile, id);
    printSuccess(`added ${id}`);
    return;
  }

  if (sub === "remove") {
    const profile = rest[0];
    const id = rest[1];
    if (!profile || !id) return printError("native remove <profile> <id>");
    await client.removeNative(profile, id);
    printSuccess(`removed ${id}`);
    return;
  }

  printError(`unknown: native ${sub ?? ""}. Try: list, add, remove`);
}
