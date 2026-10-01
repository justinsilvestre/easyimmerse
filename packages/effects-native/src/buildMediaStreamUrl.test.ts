import { describe, expect, it } from "vitest";
import { buildMediaStreamUrl } from "./buildMediaStreamUrl.ts";

const server = { serverUrl: "http://127.0.0.1:8787", token: "secret" };

describe("buildMediaStreamUrl", () => {
  it("points at the media's stream route with the token", () => {
    expect(buildMediaStreamUrl(server, "p1", "m1")).toBe(
      "http://127.0.0.1:8787/projects/p1/media/m1/stream?token=secret",
    );
  });

  it("encodes the ids", () => {
    expect(buildMediaStreamUrl(server, "p 1", "m/1")).toBe(
      "http://127.0.0.1:8787/projects/p%201/media/m%2F1/stream?token=secret",
    );
  });
});
