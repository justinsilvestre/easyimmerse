import { describe, expect, it } from "vitest";
import { loadNotices } from "./licenseNotices.ts";

const groups = [{ title: "Rust crates", notices: [] }];

describe("loadNotices", () => {
  it("answers with the groups once they load", async () => {
    expect(await loadNotices(async () => groups)).toEqual({ data: groups });
  });

  it("answers a failure to load with a client error", async () => {
    const result = await loadNotices(() =>
      Promise.reject(new Error("offline")),
    );
    expect(result.error?.code).toBe("licenseNoticesUnloadable");
  });
});
