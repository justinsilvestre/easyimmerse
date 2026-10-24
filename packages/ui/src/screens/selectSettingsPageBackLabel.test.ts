import { actions } from "@easyimmerse/state";
import { describe, expect, it } from "vitest";
import { createTestAppStore } from "../testSupport/createTestAppStore.ts";
import { selectSettingsPageBackLabel } from "./selectSettingsPageBackLabel.ts";

describe("selectSettingsPageBackLabel", () => {
  it("names the general settings for a page opened from them", () => {
    const { store } = createTestAppStore();
    store.dispatch(actions.navigated({ type: "openSettings" }));
    store.dispatch(actions.navigated({ type: "openAccountSettings" }));
    expect(selectSettingsPageBackLabel(store.getState())).toBe("Settings");
  });

  it("says Back for a page opened over the main screen", () => {
    const { store } = createTestAppStore();
    store.dispatch(actions.navigated({ type: "openAccountSettings" }));
    expect(selectSettingsPageBackLabel(store.getState())).toBe("Back");
  });
});
