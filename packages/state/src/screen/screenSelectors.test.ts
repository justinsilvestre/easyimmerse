import { describe, expect, it } from "vitest";
import { actions } from "../app/appAction.ts";
import { stateAfter } from "../app/stateAfter.ts";
import type { PickedMediaFile } from "../platform/effects.ts";
import {
  selectCurrentTime,
  selectPendingDictionaryFile,
  selectPendingFilePick,
  selectPendingMediaFile,
  selectPlayer,
  selectPlayerDuration,
} from "./screenSelectors.ts";

const pickedMediaFile: PickedMediaFile = {
  name: "a.mp4",
  source: { kind: "path", path: "/a" },
};

const playing = {
  app: stateAfter(
    actions.openMediaFileRequested("p1", "m1"),
    actions.playerDurationChanged(90),
    actions.playerTimeChanged(4),
    actions.filePickRequested(),
  ),
};

describe("screenSelectors", () => {
  it("selectCurrentTime returns the player's current time", () => {
    expect(selectCurrentTime(playing)).toBe(4);
  });

  it("selectPlayerDuration returns the loaded file's duration", () => {
    expect(selectPlayerDuration(playing)).toBe(90);
  });

  it("selectPlayer returns the whole player state", () => {
    expect(selectPlayer(playing)).toEqual({
      currentTimeSeconds: 4,
      durationSeconds: 90,
      buffered: [],
      isPlaying: false,
    });
  });

  it("selectPlayer returns an idle player while no media screen is open", () => {
    expect(selectPlayer({ app: stateAfter() }).durationSeconds).toBe(0);
  });

  it("selectPendingFilePick returns whether a file pick is pending", () => {
    expect(selectPendingFilePick(playing)).toBe(true);
  });

  it("selectPendingMediaFile returns the media file waiting to be added", () => {
    const chosen = {
      app: stateAfter(
        actions.navigated({ type: "openProject", projectId: "p1" }),
        actions.mediaFileChosen(pickedMediaFile),
      ),
    };
    expect(selectPendingMediaFile(chosen)?.name).toBe("a.mp4");
  });

  it("selectPendingDictionaryFile returns the dictionary file waiting to be imported", () => {
    const chosen = {
      app: stateAfter(
        actions.navigated({ type: "openDictionaries" }),
        actions.dictionaryFileChosen(pickedMediaFile),
      ),
    };
    expect(selectPendingDictionaryFile(chosen)?.name).toBe("a.mp4");
  });
});
