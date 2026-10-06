import { describe, expect, it } from "vitest";
import { buildDictionaryMediaUrl } from "./dictionaryMediaUrl.ts";

const server = { serverUrl: "http://127.0.0.1:8787", token: "secret" };

describe("buildDictionaryMediaUrl", () => {
  it("addresses the media route of the dictionary", () => {
    expect(buildDictionaryMediaUrl(server, "d1", "cat.png")).toBe(
      "http://127.0.0.1:8787/dictionaries/d1/media/cat.png?token=secret",
    );
  });

  it("encodes the slashes of the path as one segment", () => {
    expect(buildDictionaryMediaUrl(server, "d1", "img/cat.png")).toContain(
      "/media/img%2Fcat.png",
    );
  });
});
