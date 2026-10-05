import { describe, expect, it } from "vitest";
import { initialReaderState, updateReader } from "./readerState.ts";

const start = { chapterIndex: 0, paragraphIndex: 0, offset: 0 };
const later = { chapterIndex: 1, paragraphIndex: 4, offset: 12 };

describe("updateReader", () => {
  it("gives every jump a new id", () => {
    const once = updateReader(initialReaderState(start), {
      type: "jumped",
      location: later,
    });
    expect(
      updateReader(once, { type: "jumped", location: later }).jump.id,
    ).toBe(2);
  });

  it("records a reported location without jumping", () => {
    expect(
      updateReader(initialReaderState(start), {
        type: "locationReported",
        location: later,
      }).jump.location,
    ).toEqual(start);
  });

  it("keeps the same state when the reported location has not moved", () => {
    const state = initialReaderState(later);
    expect(
      updateReader(state, { type: "locationReported", location: { ...later } }),
    ).toBe(state);
  });

  it("closes a panel when it is toggled again", () => {
    const open = updateReader(initialReaderState(start), {
      type: "panelToggled",
      panel: "contents",
    });
    expect(
      updateReader(open, { type: "panelToggled", panel: "contents" }).panel,
    ).toBeNull();
  });

  it("keeps a panel open when it is opened again", () => {
    const open = updateReader(initialReaderState(start), {
      type: "panelOpened",
      panel: "search",
    });
    expect(
      updateReader(open, { type: "panelOpened", panel: "search" }).panel,
    ).toBe("search");
  });

  it("keeps the chrome while a panel is open", () => {
    const open = updateReader(initialReaderState(start), {
      type: "panelToggled",
      panel: "search",
    });
    expect(updateReader(open, { type: "chromeHidden" }).isChromeVisible).toBe(
      true,
    );
  });

  it("forgets the chosen match when the query changes", () => {
    const chosen = updateReader(initialReaderState(start), {
      type: "matchChosen",
      index: 3,
      location: later,
    });
    expect(
      updateReader(chosen, { type: "searchChanged", query: "Tisch" }).search
        .activeMatchIndex,
    ).toBeNull();
  });

  it("jumps to a chosen match", () => {
    expect(
      updateReader(initialReaderState(start), {
        type: "matchChosen",
        index: 3,
        location: later,
      }).jump.location,
    ).toEqual(later);
  });
});
