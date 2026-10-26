import { describe, expect, it } from "vitest";
import { actions } from "../app/appAction.ts";
import { stateAfter } from "../app/stateAfter.ts";
import { mainScreenMoveOf } from "./mainScreenMoveOf.ts";

const open = stateAfter(actions.openMediaFileRequested("p1", "m1"));

describe("mainScreenMoveOf", () => {
  it("returns the move from the media screen to the project it belongs to", () => {
    expect(
      mainScreenMoveOf(open, actions.locationChanged("/projects/p1")),
    ).toEqual({
      from: { screen: "media", projectId: "p1", mediaFileId: "m1" },
      to: { screen: "project", projectId: "p1" },
    });
  });

  it("returns null when Settings open over the main screen", () => {
    expect(
      mainScreenMoveOf(
        open,
        actions.locationChanged("/projects/p1/media/m1?settings=general"),
      ),
    ).toBeNull();
  });

  it("returns null for an action other than a reported location", () => {
    expect(mainScreenMoveOf(open, actions.playerTimeChanged(3))).toBeNull();
  });
});
