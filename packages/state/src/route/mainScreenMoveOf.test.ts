import { describe, expect, it } from "vitest";
import { actions } from "../app/appAction.ts";
import { stateAfter } from "../app/stateAfter.ts";
import { mainScreenMoveOf } from "./mainScreenMoveOf.ts";

const open = stateAfter(actions.openMediaFileRequested("p1", "m1"));

describe("mainScreenMoveOf", () => {
  it("returns the move from the media screen to the project it belongs to", () => {
    expect(mainScreenMoveOf(open, actions.closeMedia())).toEqual({
      from: { screen: "media", projectId: "p1", mediaFileId: "m1" },
      to: { screen: "project", projectId: "p1" },
    });
  });

  it("returns null when Settings open over the main screen", () => {
    expect(mainScreenMoveOf(open, actions.settingsRequested())).toBeNull();
  });

  it("returns null when the action leaves the route as it is", () => {
    expect(mainScreenMoveOf(open, actions.playerTimeChanged(3))).toBeNull();
  });
});
