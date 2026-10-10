import { describe, expect, it } from "vitest";
import { actions } from "../app/appAction.ts";
import type { PickedFile } from "../platform/effects.ts";
import { dictionaryFileExtensions } from "./dictionaryFileExtensions.ts";
import { mediaFileExtensions } from "./mediaFileExtensions.ts";
import { updateDialog } from "./updateDialog.ts";

const pickedFile: PickedFile = {
  name: "episode.srt",
  source: { kind: "inline", text: "1\n00:00:01,000 --> 00:00:02,000\nHello" },
};

const picking = { kind: "filePick", for: "subtitles" } as const;

describe("updateDialog", () => {
  it("marks a file pick as pending for filePickRequested", () => {
    const [dialog] = updateDialog(null, actions.filePickRequested());
    expect(dialog).toEqual(picking);
  });

  it("returns a pickFile effect accepting subtitle files for filePickRequested", () => {
    const [, effects] = updateDialog(null, actions.filePickRequested());
    expect(effects).toEqual([{ type: "pickFile", accept: [".srt", ".vtt"] }]);
  });

  it("clears the pending file pick for fileChosen", () => {
    const [dialog] = updateDialog(picking, actions.fileChosen(pickedFile));
    expect(dialog).toBeNull();
  });

  it("clears the pending file pick for filePickCancelled", () => {
    const [dialog] = updateDialog(picking, actions.filePickCancelled());
    expect(dialog).toBeNull();
  });

  it("returns a pickMediaFile effect accepting media files for mediaFilePickRequested", () => {
    const [, effects] = updateDialog(null, actions.mediaFilePickRequested());
    expect(effects).toEqual([
      { type: "pickMediaFile", accept: mediaFileExtensions },
    ]);
  });

  it("returns a pickDictionaryFile effect accepting dictionary files for dictionaryFilePickRequested", () => {
    const [, effects] = updateDialog(
      null,
      actions.dictionaryFilePickRequested(),
    );
    expect(effects).toEqual([
      { type: "pickDictionaryFile", accept: dictionaryFileExtensions },
    ]);
  });
});
