import type { Cue } from "@easyimmerse/types";
import { describe, expect, it } from "vitest";
import { type LookupRequest, reduceLookupPopup } from "./lookupPopup.ts";

const cue: Cue = { index: 3, start_ms: 0, end_ms: 1000, text: "Ich rufe an." };

const request: LookupRequest = {
  term: "rufe",
  lookup: { text: "rufe an.", context: "Ich rufe an.", offset: 4 },
  cue,
};

describe("reduceLookupPopup", () => {
  it("opens on a chosen word", () => {
    expect(reduceLookupPopup(null, { type: "wordChosen", request })).toEqual({
      mode: "hover",
      request,
    });
  });

  it("opens the search field with nothing looked up", () => {
    expect(reduceLookupPopup(null, { type: "searchOpened" })).toEqual({
      mode: "search",
      request: null,
    });
  });

  it("keeps the cue of the first word when a word in the pop-up is looked up", () => {
    const popup = reduceLookupPopup(null, { type: "wordChosen", request });
    expect(
      reduceLookupPopup(popup, { type: "termSearched", term: "anrufen" })
        ?.request?.cue,
    ).toBe(cue);
  });

  it("ignores an empty search", () => {
    const popup = reduceLookupPopup(null, { type: "searchOpened" });
    expect(reduceLookupPopup(popup, { type: "termSearched", term: " " })).toBe(
      popup,
    );
  });

  it("closes", () => {
    const popup = reduceLookupPopup(null, { type: "searchOpened" });
    expect(reduceLookupPopup(popup, { type: "closed" })).toBeNull();
  });
});
