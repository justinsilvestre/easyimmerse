import type { Cue } from "@easyimmerse/types";
import { describe, expect, it } from "vitest";
import { type LookupRequest, reduceLookupPopup } from "./lookupPopup.ts";

const cue: Cue = { index: 3, start_ms: 0, end_ms: 1000, text: "Ich rufe an." };

const request: LookupRequest<Cue> = {
  term: "rufe",
  lookup: { text: "rufe an.", context: "Ich rufe an.", offset: 4 },
  source: cue,
  occurrence: "3:4",
  anchor: document.createElement("button"),
};

describe("reduceLookupPopup", () => {
  it("opens on a chosen word", () => {
    expect(reduceLookupPopup(null, { type: "wordChosen", request })).toEqual({
      mode: "word",
      request,
    });
  });

  it("opens the search field with nothing looked up", () => {
    expect(reduceLookupPopup<Cue>(null, { type: "searchOpened" })).toEqual({
      mode: "search",
      request: null,
    });
  });

  it("keeps the passage of the first word when a word in the pop-up is looked up", () => {
    const popup = reduceLookupPopup(null, { type: "wordChosen", request });
    expect(
      reduceLookupPopup(popup, { type: "termSearched", term: "anrufen" })
        ?.request?.source,
    ).toBe(cue);
  });

  it("keeps the pop-up at the first word when a word in the pop-up is looked up", () => {
    const popup = reduceLookupPopup(null, { type: "wordChosen", request });
    expect(
      reduceLookupPopup(popup, { type: "termSearched", term: "anrufen" })
        ?.request?.anchor,
    ).toBe(request.anchor);
  });

  it("ignores an empty search", () => {
    const popup = reduceLookupPopup<Cue>(null, { type: "searchOpened" });
    expect(reduceLookupPopup(popup, { type: "termSearched", term: " " })).toBe(
      popup,
    );
  });

  it("closes", () => {
    const popup = reduceLookupPopup<Cue>(null, { type: "searchOpened" });
    expect(reduceLookupPopup(popup, { type: "closed" })).toBeNull();
  });
});
