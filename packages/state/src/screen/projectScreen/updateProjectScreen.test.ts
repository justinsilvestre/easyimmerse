import { describe, expect, it } from "vitest";
import { actions } from "../../app/appAction.ts";
import type { PickedMediaFile } from "../../platform/effects.ts";
import { updateProjectScreen } from "./updateProjectScreen.ts";

const pickedMediaFile: PickedMediaFile = {
  name: "episode.mkv",
  source: { kind: "path", path: "/videos/episode.mkv" },
};

const chosen = { kind: "project", pendingMediaFile: pickedMediaFile } as const;

describe("updateProjectScreen", () => {
  it("keeps the chosen media file for mediaFileChosen", () => {
    const screen = updateProjectScreen(
      { kind: "project", pendingMediaFile: null },
      actions.mediaFileChosen(pickedMediaFile),
    );
    expect(screen.pendingMediaFile).toBe(pickedMediaFile);
  });

  it("forgets the chosen media file for mediaFileAddFailed", () => {
    const screen = updateProjectScreen(chosen, actions.mediaFileAddFailed());
    expect(screen.pendingMediaFile).toBeNull();
  });
});
