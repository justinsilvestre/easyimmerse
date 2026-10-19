import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { gzipSync } from "node:zlib";
import { describe, expect, it } from "vitest";
import { unpackFixtures } from "./unpackFixtures.ts";

function makeDirectoryWithArchive(contents: string): string {
  const directory = mkdtempSync(join(tmpdir(), "fixtures-"));
  writeFileSync(join(directory, "book.txt.gz"), gzipSync(contents));
  return directory;
}

describe("unpackFixtures", () => {
  it("writes each archive's contents next to it without the .gz extension", () => {
    const directory = makeDirectoryWithArchive("Als Gregor Samsa");
    unpackFixtures(directory);
    expect(readFileSync(join(directory, "book.txt"), "utf-8")).toBe(
      "Als Gregor Samsa",
    );
  });

  it("replaces an unpacked copy that is out of date", () => {
    const directory = makeDirectoryWithArchive("new text");
    writeFileSync(join(directory, "book.txt"), "old text");
    unpackFixtures(directory);
    expect(readFileSync(join(directory, "book.txt"), "utf-8")).toBe("new text");
  });
});
