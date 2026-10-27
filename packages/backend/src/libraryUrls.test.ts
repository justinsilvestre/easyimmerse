import { describe, expect, it } from "vitest";
import { buildLibraryCoverUrl, buildLibraryFileUrl } from "./libraryUrls.ts";

const server = { serverUrl: "http://127.0.0.1:8787", token: "secret" };

const coveredItem = { id: "i1", has_cover: true, updated_at_ms: 42 };

describe("buildLibraryCoverUrl", () => {
  it("addresses the cover route of the item, with the token and the time the item changed", () => {
    expect(buildLibraryCoverUrl(server, coveredItem)).toBe(
      "http://127.0.0.1:8787/api/library/items/i1/cover?token=secret&v=42",
    );
  });

  it("returns null for an item without a cover", () => {
    expect(
      buildLibraryCoverUrl(server, { ...coveredItem, has_cover: false }),
    ).toBeNull();
  });

  it("returns null without a server", () => {
    expect(buildLibraryCoverUrl(null, coveredItem)).toBeNull();
  });
});

describe("buildLibraryFileUrl", () => {
  it("addresses the file route of the item, with the token", () => {
    expect(buildLibraryFileUrl(server, "i1")).toBe(
      "http://127.0.0.1:8787/api/library/items/i1/file?token=secret",
    );
  });

  it("escapes ids that are not URL safe", () => {
    expect(buildLibraryFileUrl(server, "a/b")).toContain(
      "/library/items/a%2Fb/file",
    );
  });
});
