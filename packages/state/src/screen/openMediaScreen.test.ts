import { describe, expect, it } from "vitest";
import { actions } from "../app/appAction.ts";
import { stateAfter } from "../app/stateAfter.ts";
import { mediaScreenLeftBy } from "./openMediaScreen.ts";

const open = stateAfter(
  actions.openMediaFileRequested("p1", "m1"),
  actions.playerTimeChanged(4),
);

describe("mediaScreenLeftBy", () => {
  it("returns the media screen that the route change closes", () => {
    expect(mediaScreenLeftBy(open, actions.closeMedia())?.mediaFileId).toBe(
      "m1",
    );
  });

  it("returns null while the media screen stays open", () => {
    expect(mediaScreenLeftBy(open, actions.settingsRequested())).toBeNull();
  });

  it("returns null when no media screen is open", () => {
    expect(mediaScreenLeftBy(stateAfter(), actions.closeMedia())).toBeNull();
  });
});
