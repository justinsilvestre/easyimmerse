import { describe, expect, it } from "vitest";
import { buildMediaStreamUrl } from "./mediaStreamUrl.ts";

const server = { serverUrl: "http://127.0.0.1:8787", token: "secret" };

describe("buildMediaStreamUrl", () => {
  it("addresses the stream route of the media file", () => {
    expect(buildMediaStreamUrl(server, "p1", "m1")).toBe(
      "http://127.0.0.1:8787/projects/p1/media/m1/stream?token=secret",
    );
  });

  it("escapes ids that are not URL safe", () => {
    expect(buildMediaStreamUrl(server, "a/b", "m1")).toContain(
      "/projects/a%2Fb/media/m1/stream",
    );
  });
});
