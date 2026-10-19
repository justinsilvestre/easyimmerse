import { describe, expect, it } from "vitest";
import { actions } from "../app/appAction.ts";
import type { Route } from "../route/route.ts";
import { updateSettings } from "./updateSettings.ts";

const dictionariesPage: Route = {
  screen: "settings",
  beneath: { screen: "home" },
  pages: ["general", "dictionaries"],
};

const generalPage: Route = {
  screen: "settings",
  beneath: { screen: "home" },
  pages: ["general"],
};

const report = { conversionCacheReport: "Cleared." };

describe("updateSettings", () => {
  it("starts with no report when Settings open", () => {
    const [settings] = updateSettings(
      null,
      actions.settingsRequested(),
      generalPage,
    );
    expect(settings).toEqual({ conversionCacheReport: null });
  });

  it("drops its state once Settings close", () => {
    const [settings] = updateSettings(
      report,
      actions.navigated({ type: "closeSettings" }),
      { screen: "home" },
    );
    expect(settings).toBeNull();
  });

  it("keeps the media cache's report while the general page is on top", () => {
    const [settings] = updateSettings(
      { conversionCacheReport: null },
      actions.requestSettled(
        "settings/conversionCache/clear",
        { kind: "clearConversionCache" },
        { ok: false, error: { status: 500, message: "disk busy" } },
      ),
      generalPage,
    );
    expect(settings?.conversionCacheReport).toBe("disk busy");
  });

  it("drops the media cache's report when the dictionaries page opens over the general page", () => {
    const [settings] = updateSettings(
      report,
      actions.navigated({ type: "openDictionaries" }),
      dictionariesPage,
    );
    expect(settings?.conversionCacheReport).toBeNull();
  });
});
