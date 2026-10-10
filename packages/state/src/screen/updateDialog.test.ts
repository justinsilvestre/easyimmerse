import { describe, expect, it } from "vitest";
import type { AppAction } from "../app/appAction.ts";
import { actions } from "../app/appAction.ts";
import { stateAfter } from "../app/stateAfter.ts";
import type { PickedFile } from "../platform/effects.ts";
import { dictionaryFileExtensions } from "./dictionaryFileExtensions.ts";
import { mediaFileExtensions } from "./mediaFileExtensions.ts";
import { updateDialog } from "./updateDialog.ts";

/** The app with the dictionaries page of Settings open over the home screen. */
const onDictionariesPage = stateAfter(
  actions.navigated({ type: "openDictionaries" }),
);

/** Applies an action to a dialog while the dictionaries page is on top. */
const applyDialog = (
  dialog: Parameters<typeof updateDialog>[0],
  action: AppAction,
) => updateDialog(dialog, action, onDictionariesPage);

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

  it("leaves a track choice open when a subtitles file is chosen", () => {
    const choosing = {
      kind: "trackChoice",
      selection: null,
      stage: "choosing",
    } as const;
    const [dialog] = applyDialog(
      choosing,
      actions.subtitleFileChosen(pickedFile),
    );
    expect(dialog).toBe(choosing);
  });

  it("leaves a track choice open when a subtitles pick is cancelled", () => {
    const choosing = {
      kind: "trackChoice",
      selection: null,
      stage: "choosing",
    } as const;
    const [dialog] = applyDialog(choosing, actions.subtitleFilePickCancelled());
    expect(dialog).toBe(choosing);
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

  it("opens the subtitle appearance dialog for subtitleAppearanceOpened", () => {
    const [dialog] = applyDialog(null, actions.subtitleAppearanceOpened());
    expect(dialog).toEqual({ kind: "subtitleAppearance" });
  });

  it("closes the subtitle appearance dialog for subtitleAppearanceClosed", () => {
    const [dialog] = applyDialog(
      { kind: "subtitleAppearance" },
      actions.subtitleAppearanceClosed(),
    );
    expect(dialog).toBeNull();
  });

  it("leaves another dialog open for subtitleAppearanceClosed", () => {
    const [dialog] = applyDialog(picking, actions.subtitleAppearanceClosed());
    expect(dialog).toBe(picking);
  });

  describe("for the removal of a dictionary", () => {
    const asking = { kind: "removeDictionary", dictionaryId: "d1" } as const;

    it("asks whether to remove the dictionary", () => {
      const [dialog] = applyDialog(
        null,
        actions.dictionaryRemovalRequested("d1"),
      );
      expect(dialog).toEqual(asking);
    });

    it("closes the question once the removal is confirmed", () => {
      const [dialog] = applyDialog(
        asking,
        actions.dictionaryRemovalConfirmed("d1"),
      );
      expect(dialog).toBeNull();
    });

    it("removes the dictionary once its removal is confirmed", () => {
      const [, effects] = applyDialog(
        asking,
        actions.dictionaryRemovalConfirmed("d1"),
      );
      expect(effects).toEqual([
        {
          type: "sendRequest",
          id: "settings/dictionaries/remove/d1",
          request: { kind: "deleteDictionary", dictionaryId: "d1" },
        },
      ]);
    });

    it("removes no dictionary for a confirmation when no question is open", () => {
      const [, effects] = applyDialog(
        null,
        actions.dictionaryRemovalConfirmed("d1"),
      );
      expect(effects).toEqual([]);
    });

    it("sends nothing when the removal is cancelled", () => {
      const [, effects] = applyDialog(
        asking,
        actions.dictionaryRemovalCancelled(),
      );
      expect(effects).toEqual([]);
    });

    it("closes the question once the dictionaries page closes", () => {
      const [dialog] = applyDialog(
        asking,
        actions.navigated({ type: "closeSettings" }),
      );
      expect(dialog).toBeNull();
    });

    it("closes the question when it is cancelled", () => {
      const [dialog] = applyDialog(
        asking,
        actions.dictionaryRemovalCancelled(),
      );
      expect(dialog).toBeNull();
    });
  });
});
