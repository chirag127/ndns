// Output formatting — table (default), json, csv.

export type OutputFormat = "table" | "json" | "csv";

export function formatOutput(
  rows: Record<string, unknown>[],
  format: OutputFormat = "table",
): string {
  if (!rows || rows.length === 0) {
    return format === "json" ? "[]" : "(no rows)";
  }
  if (format === "json") return JSON.stringify(rows, null, 2);
  const headers = Object.keys(rows[0]);
  if (format === "csv") return toCsv(rows, headers);
  return toTable(rows, headers);
}

function toCsv(rows: Record<string, unknown>[], headers: string[]): string {
  const esc = (v: unknown) => {
    const s = v == null ? "" : String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const lines = [headers.join(",")];
  for (const r of rows) lines.push(headers.map((h) => esc(r[h])).join(","));
  return lines.join("\n");
}

function toTable(rows: Record<string, unknown>[], headers: string[]): string {
  const widths = headers.map((h) =>
    Math.max(
      h.length,
      ...rows.map((r) => (r[h] == null ? 0 : String(r[h]).length)),
    )
  );
  const pad = (s: string, w: number) => s + " ".repeat(Math.max(0, w - s.length));
  const line = headers.map((h, i) => pad(h, widths[i])).join("  ");
  const sep = widths.map((w) => "-".repeat(w)).join("  ");
  const body = rows
    .map((r) =>
      headers
        .map((h, i) => pad(r[h] == null ? "" : String(r[h]), widths[i]))
        .join("  ")
    )
    .join("\n");
  return `${line}\n${sep}\n${body}`;
}

export function printJson(obj: unknown): void {
  console.log(JSON.stringify(obj, null, 2));
}

export function printSuccess(msg: string): void {
  console.log(msg);
}

export function printError(msg: string): void {
  console.error(`error: ${msg}`);
}
