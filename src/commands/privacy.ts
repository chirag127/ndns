// privacy — /privacy obj (blocklists + natives are separate commands).

import { NextDnsClient } from "../client.ts";
import { getApiKey } from "../util/env.ts";
import { printError, printJson, printSuccess } from "../util/fmt.ts";
import { parseArgs, toBool } from "../args.ts";

export async function privacy(args: string[]): Promise<void> {
  const sub = args[0];
  const rest = args.slice(1);
  const client = new NextDnsClient(getApiKey());

  if (sub === "show") {
    const profile = rest[0];
    if (!profile) return printError("privacy show <profile>");
    printJson(await client.getPrivacy(profile));
    return;
  }

  if (sub === "set") {
    const profile = rest[0];
    if (!profile) {
      return printError(
        "privacy set <profile> --disguised-trackers=<bool> --allow-affiliate=<bool>",
      );
    }
    const opts = parseArgs(rest.slice(1), { boolean: ["disguised-trackers", "allow-affiliate"] });
    const body: Record<string, unknown> = {};
    const dt = toBool(opts.values["disguised-trackers"]);
    const aa = toBool(opts.values["allow-affiliate"]);
    if (dt !== undefined) body.disguisedTrackers = dt;
    if (aa !== undefined) body.allowAffiliate = aa;
    if (Object.keys(body).length === 0) return printError("no changes");
    await client.patchPrivacy(profile, body);
    printSuccess("privacy updated");
    return;
  }

  printError(`unknown: privacy ${sub ?? ""}. Try: show, set`);
}
