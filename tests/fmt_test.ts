import { assertEquals } from "@std/assert";
import { formatOutput } from "../src/util/fmt.ts";

const rows = [
  { id: "abc123", name: "Home" },
  { id: "xyz789", name: "Office" },
];

Deno.test("formatOutput: empty rows", () => {
  assertEquals(formatOutput([], "json"), "[]");
  assertEquals(formatOutput([], "table"), "(no rows)");
  assertEquals(formatOutput([], "csv"), "(no rows)");
});

Deno.test("formatOutput: json", () => {
  assertEquals(formatOutput(rows, "json"), JSON.stringify(rows, null, 2));
});

Deno.test("formatOutput: csv header + rows", () => {
  assertEquals(
    formatOutput(rows, "csv"),
    "id,name\nabc123,Home\nxyz789,Office",
  );
});

Deno.test("formatOutput: csv escapes commas, quotes, newlines", () => {
  const tricky = [{ v: 'a,b "c"\nd' }];
  assertEquals(formatOutput(tricky, "csv"), 'v\n"a,b ""c""\nd"');
});

Deno.test("formatOutput: csv renders null/undefined as empty", () => {
  const withNulls = [{ a: null, b: undefined }];
  assertEquals(formatOutput(withNulls, "csv"), "a,b\n,");
});

Deno.test("formatOutput: table aligns columns and adds separator", () => {
  const out = formatOutput(rows, "table");
  const lines = out.split("\n");
  assertEquals(lines.length, 4);
  assertEquals(lines[0], "id      name  ");
  assertEquals(lines[1], "------  ------");
  assertEquals(lines[2], "abc123  Home  ");
  assertEquals(lines[3], "xyz789  Office");
});

Deno.test("formatOutput: table defaults when format omitted", () => {
  assertEquals(formatOutput(rows), formatOutput(rows, "table"));
});
