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
    expect(state.chosenFile).toEqual({ purpose: subtitles, file: pickedFile });
  });

  it("clears the pending file pick for filePickCancelled", () => {
    const [state] = update(pending(), actions.filePickCancelled());
    expect(state.pendingFilePick).toBeNull();
  });

  it("clears the chosen file for chosenFileHandled", () => {
    const chosen = createAppState(
      {},
      { chosenFile: { purpose: subtitles, file: pickedFile } },
    );
    const [state] = update(chosen, actions.chosenFileHandled());
    expect(state.chosenFile).toBeNull();
  });
});
