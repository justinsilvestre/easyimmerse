import { actions } from "@easyimmerse/state";
import { describe, expect, it } from "vitest";
import { selectSettingsPageBackLabel } from "./selectSettingsPageBackLabel.ts";
import { createTestAppStore } from "./testSupport/createTestAppStore.ts";

describe("selectSettingsPageBackLabel", () => {
  it("names the general settings for a page opened from them", () => {
    const { store } = createTestAppStore();
    store.dispatch(actions.navigated({ type: "openSettings" }));
    store.dispatch(actions.navigated({ type: "openAccountSettings" }));
    expect(selectSettingsPageBackLabel(store.getState())).toBe("Settings");
  });

  it("names the page beneath for a page opened from another settings page", () => {
    const { store } = createTestAppStore();
    store.dispatch(actions.navigated({ type: "openServerSettings" }));
    store.dispatch(actions.navigated({ type: "openUsers", via: "self" }));
    expect(selectSettingsPageBackLabel(store.getState())).toBe("Server");
  });

  it("says Back for a page opened over the main screen", () => {
    const { store } = createTestAppStore();
    store.dispatch(actions.navigated({ type: "openAccountSettings" }));
    expect(selectSettingsPageBackLabel(store.getState())).toBe("Back");
  });
});
