import { describe, expect, it } from "vitest";
import { fixtureConversionCacheStatus } from "../testSupport/mediaFixtureResponses.ts";
import { conversionCacheViewOf } from "./conversionCacheViewOf.ts";

describe("conversionCacheViewOf", () => {
  it("shows the status the server reports", () => {
    expect(
      conversionCacheViewOf(fixtureConversionCacheStatus, undefined),
    ).toEqual({ kind: "available", status: fixtureConversionCacheStatus });
  });

  it("shows nothing while the status loads", () => {
    expect(conversionCacheViewOf(undefined, undefined)).toEqual({
      kind: "loading",
    });
  });

  it("treats conversion as unavailable when the server says so", () => {
    expect(
      conversionCacheViewOf(undefined, {
        status: 503,
        code: "conversion_unavailable",
        message: "this server has no ffmpeg",
      }),
    ).toEqual({ kind: "unavailable" });
  });

  it("treats conversion as unavailable without a server", () => {
    expect(
      conversionCacheViewOf(undefined, {
        status: "OFFLINE",
        message: "needs a server",
      }),
    ).toEqual({ kind: "unavailable" });
  });

  it("reports any other failure to read the status", () => {
    expect(
      conversionCacheViewOf(undefined, { status: 500, message: "down" }),
    ).toEqual({ kind: "failed", message: "down" });
  });
});
