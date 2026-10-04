import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  parseDesktopServerFile,
  parseShellAssignments,
} from "./desktopServerFile.ts";

describe("parseShellAssignments", () => {
  it("reads an unquoted value", () => {
    const values = parseShellAssignments("URL=http://127.0.0.1:8787\n");
    assert.equal(values.get("URL"), "http://127.0.0.1:8787");
  });

  it("reads a single-quoted value with spaces", () => {
    const values = parseShellAssignments("DB='/a/Application Support/b'\n");
    assert.equal(values.get("DB"), "/a/Application Support/b");
  });

  it("reads an escaped single quote between quoted parts", () => {
    const values = parseShellAssignments("DB='it'\\''s'\n");
    assert.equal(values.get("DB"), "it's");
  });

  it("skips lines without an assignment", () => {
    const values = parseShellAssignments("# comment\n\n");
    assert.equal(values.size, 0);
  });
});

describe("parseDesktopServerFile", () => {
  const complete = [
    "EASYIMMERSE_DESKTOP_SERVER_URL='http://127.0.0.1:8787'",
    "EASYIMMERSE_DESKTOP_TOKEN='abc'",
    "EASYIMMERSE_DESKTOP_DATABASE='/data/easyimmerse.sqlite'",
    "EASYIMMERSE_DESKTOP_CACHE_DIR='/cache'",
  ].join("\n");

  it("reads the server and its storage paths", () => {
    assert.deepEqual(parseDesktopServerFile(complete), {
      url: "http://127.0.0.1:8787",
      token: "abc",
      storage: { databasePath: "/data/easyimmerse.sqlite", cacheDir: "/cache" },
    });
  });

  it("leaves out the storage when a path is missing", () => {
    const withoutCache = complete.split("\n").slice(0, 3).join("\n");
    assert.equal(parseDesktopServerFile(withoutCache)?.storage, null);
  });

  it("returns null without a server address", () => {
    assert.equal(parseDesktopServerFile("EASYIMMERSE_DESKTOP_TOKEN=abc"), null);
  });
});
