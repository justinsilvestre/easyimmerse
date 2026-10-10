import { describe, expect, it } from "vitest";
import {
  exampleListedFlashcard,
  exampleNewFlashcard,
} from "../flashcards/exampleFlashcards.ts";
import type { RequestRecord } from "../operations/operations.ts";
import type { ServerRequest } from "../server/serverRequest.ts";
import { actions } from "./appAction.ts";
import type { AppState } from "./appState.ts";
import { stateAfter } from "./stateAfter.ts";
import { initialAppState, update } from "./update.ts";

const first: ServerRequest = { kind: "listMediaFiles", projectId: "p1" };
const second: ServerRequest = { kind: "listMediaFiles", projectId: "p2" };

const settledFirst = actions.requestSettled("a", first, {
  ok: true,
  data: { media_files: [] },
});

const undo = actions.externalLinkRequested("https://example.com/undo");

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
  return {
    ...initialAppState,
    operations: { requests, failedRequests: [], jobs: {} },
  };
}

/** The paths, down to the media screen's fields, under which two states hold different references. */
function changedPaths(before: AppState, after: AppState): string[] {
  const changedKeys = (first: object, second: object) =>
    Object.keys(first).filter(
      (key) => Reflect.get(first, key) !== Reflect.get(second, key),
    );
  return changedKeys(before, after).flatMap((slice) =>
    slice === "screen"
      ? changedKeys(before.screen, after.screen).flatMap((part) =>
          part === "main"
            ? changedKeys(before.screen.main, after.screen.main).map(
                (field) => `screen.main.${field}`,
              )
            : [`screen.${part}`],
        )
      : [slice],
  );
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
      actions.externalLinkRequested("https://example.com"),
    );
    expect(effects).toEqual([
      { type: "openExternalUrl", url: "https://example.com" },
    ]);
  });

  it("changes only the media screen's playing state as the player's time moves", () => {
    const before = stateAfter(
      actions.openMediaFileRequested("p1", "m1"),
      actions.flashcardStarted(exampleNewFlashcard("f1", "Katze"), "editor"),
      actions.playerPlayingChanged(true),
    );
    const [after] = update(before, actions.playerTimeChanged(1.5));
    expect(changedPaths(before, after)).toEqual(["screen.main.playing"]);
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
        { type: "openExternalUrl", url: "https://example.com/undo" },
      ]);
    });
  });
  it("starts guarding the close when unsaved work begins", () => {
    const [, effects] = update(
      stateAfter(actions.openMediaFileRequested("p1", "m1")),
      actions.flashcardStarted(exampleNewFlashcard("f1", "Katze"), "save"),
    );
    expect(effects).toContainEqual({ type: "guardClose", isActive: true });
  });

  it("stops guarding the close when it ends", () => {
    const app = stateAfter(
      actions.openMediaFileRequested("p1", "m1"),
      actions.flashcardStarted(exampleNewFlashcard("f1", "Katze"), "save"),
    );
    const save = app.operations.requests.find(
      ({ request }) => request.kind === "saveFlashcard",
    );
    if (save === undefined) throw new Error("No save was sent.");
    const [, effects] = update(
      app,
      actions.requestSettled(
        save.id,
        save.request as never,
        {
          ok: true,
          data: exampleListedFlashcard("f1", "Katze"),
        } as never,
      ),
    );
    expect(effects).toContainEqual({ type: "guardClose", isActive: false });
  });
});
