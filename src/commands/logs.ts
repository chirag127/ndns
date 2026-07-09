// logs — list, stream (SSE), download, clear.

import { NextDnsClient } from "../client.ts";
import { getApiKey } from "../util/env.ts";
import { printJson, printSuccess, printError } from "../util/fmt.ts";
import { parseArgs } from "../args.ts";
import { normalizeDate } from "../util/date.ts";

export async function logs(args: string[]): Promise<void> {
  const sub = args[0];
  const rest = args.slice(1);
  const client = new NextDnsClient(getApiKey());

  if (sub === "list") {
    const profile = rest[0];
    if (!profile) return printError("logs list <profile> [flags]");
    const opts = parseArgs(rest.slice(1), {
      string: ["from", "to", "sort", "limit", "cursor", "device", "status", "search", "output"],
      boolean: ["raw", "all"],
    });
    const query: Record<string, string | number | boolean | undefined> = {};
    const from = normalizeDate(opts.values.from as string | undefined);
    const to = normalizeDate(opts.values.to as string | undefined);
    if (from) query.from = from;
    if (to) query.to = to;
    if (opts.values.sort) query.sort = String(opts.values.sort);
    if (opts.values.limit) query.limit = String(opts.values.limit);
    if (opts.values.cursor) query.cursor = String(opts.values.cursor);
    if (opts.values.device) query.device = String(opts.values.device);
    if (opts.values.status) query.status = String(opts.values.status);
    if (opts.values.search) query.search = String(opts.values.search);
    if (opts.values.raw) query.raw = true;

    if (opts.values.all) {
      // auto-paginate via cursor
      const rows: unknown[] = [];
      let cursor: string | undefined;
      do {
        const env = await client.listLogs(profile, { ...query, ...(cursor ? { cursor } : {}) });
        rows.push(...(env.data ?? []));
        cursor = env.meta?.pagination?.cursor;
        if (opts.values.limit && rows.length >= parseInt(String(opts.values.limit), 10)) break;
      } while (cursor);
      printJson(rows);
      return;
    }

    const env = await client.listLogs(profile, query);
    printJson(env.data ?? []);
    return;
  }

  if (sub === "stream") {
    const profile = rest[0];
    if (!profile) return printError("logs stream <profile> [--search=domain] [--status=blocked]");
    const opts = parseArgs(rest.slice(1), { string: ["search", "status", "device"] });
    const query: Record<string, string | number | boolean | undefined> = {};
    if (opts.values.search) query.search = String(opts.values.search);
    if (opts.values.status) query.status = String(opts.values.status);
    if (opts.values.device) query.device = String(opts.values.device);

    const ac = new AbortController();
    // Best-effort SIGINT handler
    // deno-lint-ignore no-explicit-any
    const g = globalThis as any;
    if (g.Deno?.addSignalListener) {
      try { g.Deno.addSignalListener("SIGINT", () => { ac.abort(); }); } catch { /* ignore */ }
    } else if (g.process?.on) {
      g.process.on("SIGINT", () => { ac.abort(); });
    }

    try {
      for await (const evt of client.streamLogs(profile, query, ac.signal)) {
        const t = evt.timestamp ?? "";
        const dev = ((evt.device as Record<string, unknown> | undefined)?.name ?? evt.deviceId ?? "-");
        const domain = evt.domain ?? "-";
        const status = evt.status ?? "-";
        const reasons = Array.isArray(evt.reasons) ? (evt.reasons as unknown[]).map((r) => (r as Record<string, unknown>)?.name ?? r).join(",") : "";
        console.log(`${t}\t${dev}\t${domain}\t${status}\t${reasons}`);
      }
    } catch (e) {
      if ((e as Error).name === "AbortError") return;
      throw e;
    }
    return;
  }

  if (sub === "download") {
    const profile = rest[0];
    if (!profile) return printError("logs download <profile>");
    const res = await client.downloadLogsUrl(profile);
    console.log(res.url);
    return;
  }

  if (sub === "clear") {
    const profile = rest[0];
    if (!profile) return printError("logs clear <profile>");
    await client.clearLogs(profile);
    printSuccess("logs cleared");
    return;
  }

  printError(`unknown: logs ${sub ?? ""}. Try: list, stream, download, clear`);
}
