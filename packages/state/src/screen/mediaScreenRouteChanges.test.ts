import { describe, expect, it } from "vitest";
import { actions } from "../app/appAction.ts";
import { stateAfter } from "../app/stateAfter.ts";
import {
  mediaScreenEnteredBy,
  mediaScreenLeftBy,
} from "./mediaScreenRouteChanges.ts";

const toProject = actions.locationChanged("/projects/p1");

const toSettings = actions.locationChanged(
  "/projects/p1/media/m1?settings=general",
);

const open = stateAfter(
  actions.openMediaFileRequested("p1", "m1"),
  actions.playerTimeChanged(4),
);

describe("mediaScreenLeftBy", () => {
  it("returns the media screen that the route change closes", () => {
    expect(mediaScreenLeftBy(open, toProject)?.route.mediaFileId).toBe("m1");
  });

  it("returns null while the media screen stays open", () => {
    expect(mediaScreenLeftBy(open, toSettings)).toBeNull();
  });

  it("returns null when no media screen is open", () => {
    expect(mediaScreenLeftBy(stateAfter(), toProject)).toBeNull();
  });
});

describe("mediaScreenEnteredBy", () => {
  it("returns the media file that the route change opens", () => {
    const action = actions.locationChanged("/projects/p1/media/m2");
    expect(mediaScreenEnteredBy(open, action)).toBe("m2");
  });

  it("returns null when the same media file stays open", () => {
    expect(mediaScreenEnteredBy(open, toSettings)).toBeNull();
  });

  it("returns null when the route change opens no media file", () => {
    expect(mediaScreenEnteredBy(open, toProject)).toBeNull();
  });
});
