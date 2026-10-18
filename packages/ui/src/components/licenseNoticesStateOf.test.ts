import { describe, expect, it } from "vitest";
import { licenseNoticesStateOf } from "./licenseNoticesStateOf.ts";

const groups = [{ title: "Rust crates", notices: [] }];

describe("licenseNoticesStateOf", () => {
  it("is loading before the notices arrive", () => {
    expect(licenseNoticesStateOf({ isError: false })).toEqual({
      status: "loading",
    });
  });

  it("holds the groups once they load", () => {
    expect(licenseNoticesStateOf({ data: groups, isError: false })).toEqual({
      status: "loaded",
      groups,
    });
  });

  it("reports a failure to load", () => {
    expect(licenseNoticesStateOf({ isError: true })).toEqual({
      status: "failed",
    });
  });
});
