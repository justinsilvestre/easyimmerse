import { describe, expect, it } from "vitest";
import { actions } from "../app/appAction.ts";
import type { PickedFile } from "../platform/effects.ts";
import { updatePendingSubtitleFile } from "./updatePendingSubtitleFile.ts";

const pickedFile: PickedFile = {
  name: "episode.srt",
  source: { kind: "inline", text: "1\n00:00:01,000 --> 00:00:02,000\nHello" },
};

const offline = { kind: "offline", pendingSubtitleFile: null } as const;

const chosen = { kind: "offline", pendingSubtitleFile: pickedFile } as const;

describe("updatePendingSubtitleFile", () => {
  it("keeps the chosen file for fileChosen", () => {
    const [screen] = updatePendingSubtitleFile(
      offline,
      actions.fileChosen(pickedFile),
    );
    expect(screen.pendingSubtitleFile).toEqual(pickedFile);
  });

  it("forgets the chosen file for subtitleFileAdded", () => {
    const [screen] = updatePendingSubtitleFile(
      chosen,
      actions.subtitleFileAdded(),
    );
    expect(screen.pendingSubtitleFile).toBeNull();
  });

  it("returns a notification for subtitleFileAddFailed", () => {
    const [, effects] = updatePendingSubtitleFile(
      chosen,
      actions.subtitleFileAddFailed(),
    );
    expect(effects).toEqual([
      {
        type: "showNotification",
        message: "The subtitles file could not be added",
      },
    ]);
  });
});
