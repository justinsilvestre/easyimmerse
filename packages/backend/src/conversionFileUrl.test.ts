import { describe, expect, it } from "vitest";
import {
  buildAuthorizationHeader,
  buildConversionFileUrl,
} from "./conversionFileUrl.ts";

const server = { serverUrl: "http://127.0.0.1:8787", token: "secret" };

describe("buildConversionFileUrl", () => {
  it("joins the playlist path onto the server URL", () => {
    expect(
      buildConversionFileUrl(server, "/conversions/abc123/index.m3u8"),
    ).toBe("http://127.0.0.1:8787/conversions/abc123/index.m3u8");
  });

  it("puts no token in the query string", () => {
    expect(
      buildConversionFileUrl(server, "/conversions/k/init.mp4"),
    ).not.toContain("secret");
  });
});

describe("buildAuthorizationHeader", () => {
  it("carries the token as a bearer credential", () => {
    expect(buildAuthorizationHeader(server)).toBe("Bearer secret");
  });
});
