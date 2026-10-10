import { describe, expect, it } from "vitest";
import { loadLicenseNotices } from "./loadLicenseNotices.ts";

const groups = [{ title: "Rust crates", notices: [] }];

describe("loadLicenseNotices", () => {
  it("answers with the groups once they load", async () => {
    expect(await loadLicenseNotices(async () => groups)).toEqual({
      data: groups,
    });
  });

  it("answers a failure to load with a client error", async () => {
    const result = await loadLicenseNotices(() =>
      Promise.reject(new Error("offline")),
    );
    expect(result.error?.code).toBe("licenseNoticesUnloadable");
  });
});
