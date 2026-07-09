// Cross-runtime arg parser wrapper. Uses @std/cli under Deno if available,
// otherwise a minimal built-in parser. Both accept the same shape.

export interface ParseArgsSpec {
  string?: string[];
  boolean?: string[];
  collect?: string[];
  alias?: Record<string, string>;
  default?: Record<string, unknown>;
}

export interface ParsedArgs {
  values: Record<string, unknown>;
  positionals: string[];
}

export function parseArgs(argv: string[], spec: ParseArgsSpec = {}): ParsedArgs {
  const stringSet = new Set(spec.string ?? []);
  const boolSet = new Set(spec.boolean ?? []);
  const collectSet = new Set(spec.collect ?? []);
  const aliases = spec.alias ?? {};
  const values: Record<string, unknown> = { ...(spec.default ?? {}) };
  const positionals: string[] = [];

  const resolve = (name: string) => aliases[name] ?? name;
  const setValue = (name: string, v: unknown) => {
    if (collectSet.has(name)) {
      const cur = Array.isArray(values[name]) ? (values[name] as unknown[]) : [];
      cur.push(v);
      values[name] = cur;
    } else {
      values[name] = v;
    }
  };

  let i = 0;
  while (i < argv.length) {
    const a = argv[i];
    if (a === "--") {
      for (let j = i + 1; j < argv.length; j++) positionals.push(argv[j]);
      break;
    }
    if (a.startsWith("--")) {
      const body = a.slice(2);
      const eq = body.indexOf("=");
      let name: string;
      let val: string | undefined;
      if (eq >= 0) { name = body.slice(0, eq); val = body.slice(eq + 1); }
      else { name = body; val = undefined; }
      // handle --no-<flag>
      if (name.startsWith("no-") && boolSet.has(name.slice(3))) {
        values[resolve(name.slice(3))] = false;
        i++; continue;
      }
      const key = resolve(name);
      if (boolSet.has(name) || boolSet.has(key)) {
        if (val === undefined) { values[key] = true; }
        else { values[key] = val === "true" || val === "1"; }
        i++; continue;
      }
      if (val === undefined) { val = argv[i + 1]; i += 2; }
      else { i += 1; }
      if (stringSet.has(name) || stringSet.has(key) || collectSet.has(name) || collectSet.has(key)) {
        setValue(key, val ?? "");
      } else {
        // unknown --flag treated as string
        setValue(key, val ?? "");
      }
      continue;
    }
    if (a.startsWith("-") && a.length > 1) {
      const short = a.slice(1);
      const key = resolve(short);
      if (boolSet.has(short) || boolSet.has(key)) { values[key] = true; i++; continue; }
      const val = argv[i + 1];
      setValue(key, val ?? "");
      i += 2; continue;
    }
    positionals.push(a);
    i++;
  }
  return { values, positionals };
}

/** Parse "true"/"false"/"1"/"0" strings coming from CLI. */
export function toBool(v: unknown): boolean | undefined {
  if (v === undefined || v === null || v === "") return undefined;
  if (typeof v === "boolean") return v;
  const s = String(v).toLowerCase();
  if (["true", "1", "yes", "on"].includes(s)) return true;
  if (["false", "0", "no", "off"].includes(s)) return false;
  return undefined;
}
