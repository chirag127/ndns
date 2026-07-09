// Read NEXTDNS_API_KEY from process env. Works Deno + Bun + Node.
// Never log the key value. Fail helpful when missing.

export function getApiKey(): string {
  const key = readEnv("NEXTDNS_API_KEY");
  if (!key) {
    console.error("error: NEXTDNS_API_KEY is not set.");
    console.error("");
    console.error("Get your API key at https://my.nextdns.io/account");
    console.error("Then export it:");
    console.error("");
    console.error("  # bash/zsh");
    console.error("  export NEXTDNS_API_KEY='<your-key>'");
    console.error("");
    console.error("  # PowerShell");
    console.error("  $env:NEXTDNS_API_KEY = '<your-key>'");
    console.error("");
    exit(2);
  }
  return key;
}

export function readEnv(name: string): string | undefined {
  // Deno
  // deno-lint-ignore no-explicit-any
  const g = globalThis as any;
  if (g.Deno?.env?.get) {
    const v = g.Deno.env.get(name);
    if (v) return v;
  }
  // Node / Bun
  if (g.process?.env?.[name]) {
    return g.process.env[name];
  }
  return undefined;
}

export function exit(code: number): never {
  // deno-lint-ignore no-explicit-any
  const g = globalThis as any;
  if (g.Deno?.exit) g.Deno.exit(code);
  if (g.process?.exit) g.process.exit(code);
  throw new Error(`exit ${code}`);
}
