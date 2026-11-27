import { assertEquals } from "@std/assert";
import { readLines } from "../src/commands/list-helpers.ts";

async function withTempFile(
  contents: string,
  fn: (path: string) => Promise<void>,
): Promise<void> {
  const path = await Deno.makeTempFile();
  try {
    await Deno.writeTextFile(path, contents);
    await fn(path);
  } finally {
    await Deno.remove(path);
  }
}

Deno.test("readLines: no source yields empty array", async () => {
  assertEquals(await readLines({}), []);
});

Deno.test("readLines: splits lines and trims whitespace", async () => {
  await withTempFile("  example.com  \n\tads.net\n", async (path) => {
    assertEquals(await readLines({ file: path }), ["example.com", "ads.net"]);
  });
});

Deno.test("readLines: drops blank lines", async () => {
  await withTempFile("a.com\n\n\n   \nb.com\n", async (path) => {
    assertEquals(await readLines({ file: path }), ["a.com", "b.com"]);
  });
});

Deno.test("readLines: drops comment lines starting with #", async () => {
  await withTempFile("# header comment\na.com\n#b.com\nc.com\n", async (path) => {
    assertEquals(await readLines({ file: path }), ["a.com", "c.com"]);
  });
});

Deno.test("readLines: handles CRLF line endings", async () => {
  await withTempFile("a.com\r\nb.com\r\n", async (path) => {
    assertEquals(await readLines({ file: path }), ["a.com", "b.com"]);
  });
});

Deno.test("readLines: file with only comments/blanks yields empty", async () => {
  await withTempFile("# only\n\n   \n# comments\n", async (path) => {
    assertEquals(await readLines({ file: path }), []);
  });
});
