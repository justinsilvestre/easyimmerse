import { describe, expect, it } from "vitest";
import type { AppAction } from "../app/appAction.ts";
import { actions } from "../app/appAction.ts";
import { initialAppState } from "../app/update.ts";
import type { PickedFile } from "../platform/effects.ts";
import { dictionaryFileExtensions } from "./dictionaryFileExtensions.ts";
import { mediaFileExtensions } from "./mediaFileExtensions.ts";
import { updateDialog } from "./updateDialog.ts";

/** Applies an action to a dialog while the app is otherwise as it starts. */
const applyDialog = (
  dialog: Parameters<typeof updateDialog>[0],
  action: AppAction,
) => updateDialog(dialog, action, initialAppState);

const pickedFile: PickedFile = {
  name: "episode.srt",
  source: { kind: "inline", text: "1\n00:00:01,000 --> 00:00:02,000\nHello" },
};

const picking = { kind: "filePick", for: "subtitles" } as const;

describe("updateDialog", () => {
  it("marks a file pick as pending for subtitleFilePickRequested", () => {
    const [dialog] = applyDialog(null, actions.subtitleFilePickRequested());
    expect(dialog).toEqual(picking);
  });

  it("returns a pickFile effect accepting subtitle files for subtitleFilePickRequested", () => {
    const [, effects] = applyDialog(null, actions.subtitleFilePickRequested());
    expect(effects).toEqual([{ type: "pickFile", accept: [".srt", ".vtt"] }]);
  });

  it("clears the pending file pick for subtitleFileChosen", () => {
    const [dialog] = applyDialog(
      picking,
      actions.subtitleFileChosen(pickedFile),
    );
    expect(dialog).toBeNull();
  });

  it("clears the pending file pick for subtitleFilePickCancelled", () => {
    const [dialog] = applyDialog(picking, actions.subtitleFilePickCancelled());
    expect(dialog).toBeNull();
  });

  it("returns a pickMediaFile effect accepting media files for mediaFilePickRequested", () => {
    const [, effects] = applyDialog(null, actions.mediaFilePickRequested());
    expect(effects).toEqual([
      { type: "pickMediaFile", accept: mediaFileExtensions },
    ]);
  });

  it("returns a pickDictionaryFile effect accepting dictionary files for dictionaryFilePickRequested", () => {
    const [, effects] = applyDialog(
      null,
      actions.dictionaryFilePickRequested(),
    );
    expect(effects).toEqual([
      { type: "pickDictionaryFile", accept: dictionaryFileExtensions },
    ]);
  });
});
