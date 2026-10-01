import { describe, expect, it } from "vitest";
import { actions } from "../actions.ts";
import { initialAppState } from "../appState.ts";
import { createAppState } from "../testSupport/createAppState.ts";
import { update } from "../update.ts";
import type { PickedFile } from "./chosenFile.ts";

const subtitles = { kind: "subtitles", role: "target" } as const;

const pickedFile: PickedFile = {
  name: "episode.srt",
  source: { kind: "path", path: "/videos/episode.srt" },
};

const dictionary = { kind: "dictionary" } as const;

const storedDictionary: PickedFile = {
  name: "dictionary.zip",
  source: { kind: "browser_file", key: "k1" },
};

const chosenStoredDictionary = () =>
  createAppState(
    {},
    {
      chosenFile: { purpose: dictionary, file: storedDictionary, bytes: null },
    },
  );

const pending = () => createAppState({}, { pendingFilePick: subtitles });

describe("update", () => {
  it("marks a file pick for the purpose as pending for filePickRequested", () => {
    const [state] = update(
      initialAppState,
      actions.filePickRequested(subtitles),
    );
    expect(state.pendingFilePick).toEqual(subtitles);
  });

  it("returns a pickFile effect accepting subtitle files for a subtitles pick", () => {
    const [, effects] = update(
      initialAppState,
      actions.filePickRequested(subtitles),
    );
    expect(effects).toEqual([
      { type: "pickFile", purpose: subtitles, accept: [".srt", ".vtt"] },
    ]);
  });

  it("accepts zip archives for a dictionary pick", () => {
    const [, effects] = update(
      initialAppState,
      actions.filePickRequested({ kind: "dictionary" }),
    );
    expect(effects).toEqual([
      { type: "pickFile", purpose: { kind: "dictionary" }, accept: [".zip"] },
    ]);
  });

  it("accepts video, audio, and document files for a media pick", () => {
    const [, effects] = update(
      initialAppState,
      actions.filePickRequested({ kind: "media" }),
    );
    expect(effects[0]).toMatchObject({
      accept: expect.arrayContaining([".avi", ".oga", ".epub"]),
    });
  });

  it("clears the pending file pick for fileChosen", () => {
    const [state] = update(
      pending(),
      actions.fileChosen(subtitles, pickedFile),
    );
    expect(state.pendingFilePick).toBeNull();
  });

  it("stores the chosen file with its purpose for fileChosen", () => {
    const [state] = update(
      pending(),
      actions.fileChosen(subtitles, pickedFile),
    );
    expect(state.chosenFile).toEqual({
      purpose: subtitles,
      file: pickedFile,
      bytes: null,
    });
  });

  it("clears the pending file pick for filePickCancelled", () => {
    const [state] = update(pending(), actions.filePickCancelled());
    expect(state.pendingFilePick).toBeNull();
  });

  it("clears the chosen file for chosenFileHandled", () => {
    const chosen = createAppState(
      {},
      { chosenFile: { purpose: subtitles, file: pickedFile, bytes: null } },
    );
    const [state] = update(chosen, actions.chosenFileHandled());
    expect(state.chosenFile).toBeNull();
  });

  describe("for a dictionary stored in the browser", () => {
    it("keeps the chosen file without its bytes for fileChosen", () => {
      const [state] = update(
        initialAppState,
        actions.fileChosen(dictionary, storedDictionary),
      );
      expect(state.chosenFile?.bytes).toBeNull();
    });

    it("returns an effect reading the file's bytes for fileChosen", () => {
      const [, effects] = update(
        initialAppState,
        actions.fileChosen(dictionary, storedDictionary),
      );
      expect(effects).toEqual([
        {
          type: "readStoredFileBytes",
          key: "k1",
          target: { kind: "chosenFile" },
        },
      ]);
    });

    it("stores the bytes for chosenFileBytesRead with the file's key", () => {
      const bytes = new Uint8Array([1, 2]);
      const [state] = update(
        chosenStoredDictionary(),
        actions.chosenFileBytesRead("k1", bytes),
      );
      expect(state.chosenFile?.bytes).toEqual(bytes);
    });

    it("ignores chosenFileBytesRead with another key", () => {
      const [state] = update(
        chosenStoredDictionary(),
        actions.chosenFileBytesRead("k2", new Uint8Array([1])),
      );
      expect(state.chosenFile?.bytes).toBeNull();
    });
  });

  it("reads no bytes for a dictionary on disk", () => {
    const [, effects] = update(
      initialAppState,
      actions.fileChosen(dictionary, {
        name: "dictionary.zip",
        source: { kind: "path", path: "/dictionary.zip" },
      }),
    );
    expect(effects).toEqual([]);
  });

  it("reads no bytes for subtitles stored in the browser", () => {
    const [, effects] = update(
      initialAppState,
      actions.fileChosen(subtitles, { ...storedDictionary, name: "a.srt" }),
    );
    expect(effects).toEqual([]);
  });
});
