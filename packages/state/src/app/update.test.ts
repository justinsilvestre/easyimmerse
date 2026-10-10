import { describe, expect, it } from "vitest";
import type { RequestRecord } from "../operations/operations.ts";
import type { ServerRequest } from "../server/serverRequest.ts";
import { actions } from "./appAction.ts";
import { stateAfter } from "./stateAfter.ts";
import { initialAppState, update } from "./update.ts";

const first: ServerRequest = { kind: "listMediaFiles", projectId: "p1" };
const second: ServerRequest = { kind: "listMediaFiles", projectId: "p2" };

const settledFirst = actions.requestSettled("a", first, {
  ok: true,
  data: { media_files: [] },
});

const undo = actions.notificationRequested("Undone");

/** The state with one lasting notice whose Undo button carries `undo`. */
const withUndoNotice = () =>
  stateAfter(
    actions.noticeRequested({
      tone: "danger",
      message: "Refused",
      buttons: [{ label: "Undo", action: undo }],
      isTransient: false,
    }),
  );

function withRequests(...requests: RequestRecord[]) {
  return { ...initialAppState, operations: { requests, jobs: {} } };
}

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
    expect(state).toBe(initialAppState);
  });

  describe("when a request settles", () => {
    it("sends the next waiting request of its scope", () => {
      const state = withRequests(
        { id: "a", request: first, scope: "s", isWaiting: false },
        { id: "b", request: second, scope: "s", isWaiting: true },
      );
      const [, effects] = update(state, settledFirst);
      expect(effects).toEqual([
        { type: "sendRequest", id: "b", request: second, scope: "s" },
      ]);
    });
  });

  describe("for a chosen notice button", () => {
    it("closes the notice", () => {
      const [state] = update(
        withUndoNotice(),
        actions.noticeButtonChosen(1, undo),
      );
      expect(state.notices.shown).toEqual([]);
    });

    it("returns the effects of the button's action", () => {
      const [, effects] = update(
        withUndoNotice(),
        actions.noticeButtonChosen(1, undo),
      );
      expect(effects).toEqual([
        { type: "showNotification", message: "Undone" },
      ]);
    });
  });
});
