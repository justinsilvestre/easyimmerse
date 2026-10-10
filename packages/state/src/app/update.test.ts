import { describe, expect, it } from "vitest";
import { actions } from "./appAction.ts";
import { stateAfter } from "./stateAfter.ts";
import { initialAppState, update } from "./update.ts";

describe("update", () => {
  it("keeps the mute state for closeMedia", () => {
    const state = stateAfter(
      actions.openMediaFileRequested("p1", "m1"),
      actions.muteToggleRequested(),
      actions.closeMedia(),
    );
    expect(state.preferences.playerControls.isMuted).toBe(true);
  });

  it("keeps the volume and speed for closeMedia", () => {
    const state = stateAfter(
      actions.openMediaFileRequested("p1", "m1"),
      actions.volumeChangeRequested(0.3),
      actions.speedChangeRequested(1.5),
      actions.closeMedia(),
    );
    const { volume, speed } = state.preferences.playerControls;
    expect([volume, speed]).toEqual([0.3, 1.5]);
  });

  it("returns the platform's commands after the features' effects", () => {
    const [, effects] = update(
      initialAppState,
      actions.notificationRequested("Saved"),
    );
    expect(effects).toEqual([{ type: "showNotification", message: "Saved" }]);
  });

  it("leaves every slice as it is for an action no feature handles", () => {
    const [state] = update(initialAppState, actions.mediaFilePickCancelled());
    expect(state).toEqual(initialAppState);
  });
});
