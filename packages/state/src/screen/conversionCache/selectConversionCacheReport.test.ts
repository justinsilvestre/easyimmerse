import { describe, expect, it } from "vitest";
import { actions } from "../../app/appAction.ts";
import { stateAfter } from "../../app/stateAfter.ts";
import { selectConversionCacheReport } from "./selectConversionCacheReport.ts";

const openSettings = actions.settingsRequested();
const clearRequested = actions.conversionCacheClearRequested();
const clearSettled = actions.requestSettled(
  "settings/conversionCache/clear",
  { kind: "clearConversionCache" },
  { ok: false, error: { status: 500, message: "disk busy" } },
);

describe("selectConversionCacheReport", () => {
  it("says nothing before any clearing", () => {
    const app = stateAfter(openSettings);
    expect(selectConversionCacheReport({ app })).toBe("");
  });

  it("says the cache is being cleared while the clearing is in flight", () => {
    const app = stateAfter(openSettings, clearRequested);
    expect(selectConversionCacheReport({ app })).toBe("Clearing…");
  });

  it("gives the report once the clearing has settled", () => {
    const app = stateAfter(openSettings, clearRequested, clearSettled);
    expect(selectConversionCacheReport({ app })).toBe("disk busy");
  });
});
