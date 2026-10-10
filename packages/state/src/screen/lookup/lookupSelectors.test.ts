import { describe, expect, it } from "vitest";
import { actions } from "../../app/appAction.ts";
import { stateAfter } from "../../app/stateAfter.ts";
import { selectLookup, selectLookupCursor } from "./lookupSelectors.ts";
import { cat } from "./lookupTestSupport.ts";

const openM1 = actions.openMediaFileRequested("p1", "m1");

describe("selectLookup", () => {
  it("returns the open screen's lookup", () => {
    const app = stateAfter(openM1, actions.lookupWordClicked(cat, "mouse"));
    expect(selectLookup(app)?.popup?.chosen).toEqual(cat);
  });

  it("returns null outside the media screen", () => {
    expect(selectLookup(stateAfter())).toBeNull();
  });
});

describe("selectLookupCursor", () => {
  it("returns the open screen's lookup cursor", () => {
    const app = stateAfter(openM1, actions.lookupCursorMoved(cat, "mouse"));
    expect(selectLookupCursor(app)?.chosen).toEqual(cat);
  });

  it("returns null outside the media screen", () => {
    expect(selectLookupCursor(stateAfter())).toBeNull();
  });
});
