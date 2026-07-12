import { assertEquals } from "@std/assert";
import { parseArgs, toBool } from "../src/args.ts";

Deno.test("parseArgs: positionals only", () => {
  const { values, positionals } = parseArgs(["profile", "list"]);
  assertEquals(positionals, ["profile", "list"]);
  assertEquals(values, {});
});

Deno.test("parseArgs: --key=value", () => {
  const { values } = parseArgs(["--output=json"], { string: ["output"] });
  assertEquals(values.output, "json");
});

Deno.test("parseArgs: --key value (space separated)", () => {
  const { values } = parseArgs(["--from", "-6h"], { string: ["from"] });
  assertEquals(values.from, "-6h");
});

Deno.test("parseArgs: boolean flag without value is true", () => {
  const { values } = parseArgs(["--series"], { boolean: ["series"] });
  assertEquals(values.series, true);
});

Deno.test("parseArgs: --no-<flag> sets false", () => {
  const { values } = parseArgs(["--no-series"], { boolean: ["series"] });
  assertEquals(values.series, false);
});

Deno.test("parseArgs: boolean flag with explicit value", () => {
  assertEquals(
    parseArgs(["--root=true"], { boolean: ["root"] }).values.root,
    true,
  );
  assertEquals(
    parseArgs(["--root=0"], { boolean: ["root"] }).values.root,
    false,
  );
});

Deno.test("parseArgs: collect accumulates repeated flags", () => {
  const { values } = parseArgs(["--d", "a", "--d", "b"], { collect: ["d"] });
  assertEquals(values.d, ["a", "b"]);
});

Deno.test("parseArgs: alias resolution", () => {
  const { values } = parseArgs(["-o", "csv"], {
    string: ["output"],
    alias: { o: "output" },
  });
  assertEquals(values.output, "csv");
});

Deno.test("parseArgs: defaults applied", () => {
  const { values } = parseArgs([], { default: { output: "table" } });
  assertEquals(values.output, "table");
});

Deno.test("parseArgs: -- stops flag parsing", () => {
  const { positionals } = parseArgs(["cmd", "--", "--not-a-flag", "x"]);
  assertEquals(positionals, ["cmd", "--not-a-flag", "x"]);
});

Deno.test("parseArgs: mixed positionals and flags", () => {
  const { values, positionals } = parseArgs(
    ["analytics", "status", "abc123", "--from=-24h", "--limit", "50"],
    { string: ["from", "limit"] },
  );
  assertEquals(positionals, ["analytics", "status", "abc123"]);
  assertEquals(values.from, "-24h");
  assertEquals(values.limit, "50");
});

Deno.test("toBool: truthy strings", () => {
  for (const v of ["true", "1", "yes", "on", "TRUE", "On"]) {
    assertEquals(toBool(v), true, `expected ${v} -> true`);
  }
});

Deno.test("toBool: falsy strings", () => {
  for (const v of ["false", "0", "no", "off", "OFF"]) {
    assertEquals(toBool(v), false, `expected ${v} -> false`);
  }
});

Deno.test("toBool: empty/null/undefined -> undefined", () => {
  assertEquals(toBool(""), undefined);
  assertEquals(toBool(null), undefined);
  assertEquals(toBool(undefined), undefined);
});

Deno.test("toBool: unrecognized -> undefined", () => {
  assertEquals(toBool("maybe"), undefined);
});

Deno.test("toBool: passes through actual booleans", () => {
  assertEquals(toBool(true), true);
  assertEquals(toBool(false), false);
});
