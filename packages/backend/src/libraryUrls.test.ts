import { describe, expect, it } from "vitest";
import { buildLibraryCoverUrl, buildLibraryFileUrl } from "./libraryUrls.ts";

const server = { serverUrl: "http://127.0.0.1:8787", token: "secret" };

describe("buildLibraryCoverUrl", () => {
  it("addresses the cover route of the item, with the token", () => {
    expect(buildLibraryCoverUrl(server, "i1")).toBe(
      "http://127.0.0.1:8787/library/items/i1/cover?token=secret",
    );
  });
});

describe("buildLibraryFileUrl", () => {
  it("addresses the file route of the item, with the token", () => {
    expect(buildLibraryFileUrl(server, "i1")).toBe(
      "http://127.0.0.1:8787/library/items/i1/file?token=secret",
    );
  });

  it("escapes ids that are not URL safe", () => {
    expect(buildLibraryFileUrl(server, "a/b")).toContain(
      "/library/items/a%2Fb/file",
    );
  });
});
