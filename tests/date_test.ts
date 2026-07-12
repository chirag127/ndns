import { assertEquals } from "@std/assert";
import { intervalToSeconds, normalizeDate } from "../src/util/date.ts";

Deno.test("normalizeDate: undefined and empty", () => {
  assertEquals(normalizeDate(undefined), undefined);
  assertEquals(normalizeDate(""), undefined);
  assertEquals(normalizeDate("   "), undefined);
});

Deno.test("normalizeDate: relative forms pass through", () => {
  assertEquals(normalizeDate("-6h"), "-6h");
  assertEquals(normalizeDate("-1d"), "-1d");
  assertEquals(normalizeDate("-30m"), "-30m");
  assertEquals(normalizeDate("-7d"), "-7d");
  assertEquals(normalizeDate("-2w"), "-2w");
  assertEquals(normalizeDate("-45s"), "-45s");
});

Deno.test("normalizeDate: trims surrounding whitespace", () => {
  assertEquals(normalizeDate("  -6h  "), "-6h");
});

Deno.test("normalizeDate: unix seconds and ms pass through", () => {
  assertEquals(normalizeDate("1700000000"), "1700000000");
  assertEquals(normalizeDate("1700000000000"), "1700000000000");
});

Deno.test("normalizeDate: ISO 8601 passes through", () => {
  assertEquals(normalizeDate("2026-01-01T00:00:00Z"), "2026-01-01T00:00:00Z");
});

Deno.test("intervalToSeconds: named units", () => {
  assertEquals(intervalToSeconds("1s"), 1);
  assertEquals(intervalToSeconds("30m"), 1800);
  assertEquals(intervalToSeconds("1h"), 3600);
  assertEquals(intervalToSeconds("1d"), 86400);
  assertEquals(intervalToSeconds("1w"), 604800);
  assertEquals(intervalToSeconds("2h"), 7200);
});

Deno.test("intervalToSeconds: bare number falls back to parseInt", () => {
  assertEquals(intervalToSeconds("3600"), 3600);
});

Deno.test("intervalToSeconds: garbage returns 0", () => {
  assertEquals(intervalToSeconds("nonsense"), 0);
});
