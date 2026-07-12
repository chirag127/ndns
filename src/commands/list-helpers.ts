// Shared helper for denylist/allowlist bulk ops.

import { NextDnsApiError, NextDnsClient } from "../client.ts";

export type ListKind = "denylist" | "allowlist";

export async function readLines(source: { file?: string; stdin?: boolean }): Promise<string[]> {
  let text = "";
  if (source.file) {
    // deno-lint-ignore no-explicit-any
    const g = globalThis as any;
    if (g.Deno?.readTextFile) text = await g.Deno.readTextFile(source.file);
    else {
      const fs = await import("node:fs/promises");
      text = await fs.readFile(source.file, "utf8");
    }
  } else if (source.stdin) {
    text = await readStdinAll();
  }
  return text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l && !l.startsWith("#"));
}

async function readStdinAll(): Promise<string> {
  // deno-lint-ignore no-explicit-any
  const g = globalThis as any;
  if (g.Deno?.stdin?.readable) {
    const chunks: Uint8Array[] = [];
    const reader = g.Deno.stdin.readable.getReader();
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      chunks.push(value);
    }
    const total = chunks.reduce((n, c) => n + c.length, 0);
    const buf = new Uint8Array(total);
    let off = 0;
    for (const c of chunks) {
      buf.set(c, off);
      off += c.length;
    }
    return new TextDecoder().decode(buf);
  }
  // Node/Bun
  const { stdin } = await import("node:process");
  let out = "";
  for await (const chunk of stdin) {
    out += typeof chunk === "string" ? chunk : chunk.toString("utf8");
  }
  return out;
}

export interface BulkResult {
  added: number;
  existed: number;
  failed: Array<{ domain: string; error: string }>;
}

/** Concurrent bulk-add with backoff-on-error accounting. */
export async function bulkAdd(
  client: NextDnsClient,
  kind: ListKind,
  profile: string,
  domains: string[],
  concurrency = 5,
  onProgress?: (done: number, total: number) => void,
): Promise<BulkResult> {
  const result: BulkResult = { added: 0, existed: 0, failed: [] };
  let done = 0;
  const total = domains.length;
  const queue = [...domains];

  const worker = async () => {
    while (queue.length > 0) {
      const d = queue.shift();
      if (!d) break;
      try {
        if (kind === "denylist") await client.addDenylist(profile, d, true);
        else await client.addAllowlist(profile, d, true);
        result.added++;
      } catch (e) {
        if (
          e instanceof NextDnsApiError &&
          (e.status === 409 || e.errors.some((x) => (x.code || "").includes("duplicate")))
        ) {
          result.existed++;
        } else {
          result.failed.push({ domain: d, error: e instanceof Error ? e.message : String(e) });
        }
      }
      done++;
      if (onProgress) onProgress(done, total);
    }
  };
  const workers = Array.from({ length: Math.max(1, Math.min(concurrency, total)) }, () => worker());
  await Promise.all(workers);
  return result;
}
