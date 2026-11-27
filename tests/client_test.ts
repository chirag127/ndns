import { assertEquals, assertStringIncludes } from "@std/assert";
import { BASE_URL, NextDnsApiError } from "../src/client.ts";

Deno.test("BASE_URL points at the NextDNS API", () => {
  assertEquals(BASE_URL, "https://api.nextdns.io");
});

Deno.test("NextDnsApiError: joins error codes into the message", () => {
  const err = new NextDnsApiError(400, [
    { code: "invalid" },
    { code: "duplicate" },
  ]);
  assertEquals(err.status, 400);
  assertStringIncludes(err.message, "API error 400");
  assertStringIncludes(err.message, "invalid, duplicate");
});

Deno.test("NextDnsApiError: preserves the errors array", () => {
  const errors = [{ code: "not_found", detail: "profile missing" }];
  const err = new NextDnsApiError(404, errors);
  assertEquals(err.errors, errors);
  assertEquals(err.errors[0].detail, "profile missing");
});

Deno.test("NextDnsApiError: is an Error instance", () => {
  const err = new NextDnsApiError(500, [{ code: "server_error" }]);
  assertEquals(err instanceof Error, true);
  assertEquals(err instanceof NextDnsApiError, true);
});

Deno.test("NextDnsApiError: empty error list still builds a message", () => {
  const err = new NextDnsApiError(429, []);
  assertStringIncludes(err.message, "API error 429");
});
