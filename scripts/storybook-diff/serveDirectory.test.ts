import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { parseByteRange, resolveFilePath } from "./serveDirectory.ts";

describe("resolveFilePath", () => {
  it("serves index.html for a directory", () => {
    assert.equal(resolveFilePath("/site", "/"), "/site/index.html");
  });

  it("decodes the path and drops the query", () => {
    const path = resolveFilePath("/site", "/a%20b/iframe.html?id=x");
    assert.equal(path, "/site/a b/iframe.html");
  });

  it("cannot leave the directory", () => {
    assert.equal(
      resolveFilePath("/site", "/../../etc/passwd"),
      "/site/etc/passwd",
    );
  });
});

describe("parseByteRange", () => {
  it("returns null without a range header", () => {
    assert.equal(parseByteRange(undefined, 10), null);
  });

  it("clamps an open-ended range to the file", () => {
    assert.deepEqual(parseByteRange("bytes=4-", 10), { start: 4, end: 9 });
  });

  it("clamps an end past the file", () => {
    assert.deepEqual(parseByteRange("bytes=0-99", 10), { start: 0, end: 9 });
  });

  it("reads a suffix range from the end", () => {
    assert.deepEqual(parseByteRange("bytes=-3", 10), { start: 7, end: 9 });
  });

  it("returns null for a range that starts past its end", () => {
    assert.equal(parseByteRange("bytes=8-2", 10), null);
  });
});
