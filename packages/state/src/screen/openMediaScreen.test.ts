import { describe, expect, it } from "vitest";
import { actions } from "../app/appAction.ts";
import { stateAfter } from "../app/stateAfter.ts";
import { mediaScreenEnteredBy, mediaScreenLeftBy } from "./openMediaScreen.ts";

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

describe("mediaScreenEnteredBy", () => {
  it("returns the media file that the route change opens", () => {
    const action = actions.openMediaFileRequested("p1", "m2");
    expect(mediaScreenEnteredBy(open, action)).toBe("m2");
  });

  it("returns null when the same media file stays open", () => {
    const action = actions.settingsRequested();
    expect(mediaScreenEnteredBy(open, action)).toBeNull();
  });

  it("returns null when the route change opens no media file", () => {
    const action = actions.closeMedia();
    expect(mediaScreenEnteredBy(open, action)).toBeNull();
  });
});
