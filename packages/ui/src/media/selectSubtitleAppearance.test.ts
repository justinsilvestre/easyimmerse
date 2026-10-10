import { actions } from "@easyimmerse/state";
import { describe, expect, it } from "vitest";
import { createTestAppStore } from "../testSupport/createTestAppStore.ts";
import { selectSubtitleAppearance } from "./selectSubtitleAppearance.ts";
import { defaultSubtitleAppearance } from "./subtitleAppearance.ts";

describe("selectSubtitleAppearance", () => {
  it("is the default appearance while none is stored", () => {
    const { store } = createTestAppStore();
    expect(selectSubtitleAppearance(store.getState())).toEqual(
      defaultSubtitleAppearance,
    );
  });

  it("keeps its answer while the stored value stays the same", () => {
    const { store } = createTestAppStore();
    const before = selectSubtitleAppearance(store.getState());
    store.dispatch(actions.cuePanelToggled());
    expect(selectSubtitleAppearance(store.getState())).toBe(before);
  });
});
