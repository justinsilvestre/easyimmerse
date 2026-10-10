import { describe, expect, it } from "vitest";
import { actions } from "../../app/appAction.ts";
import { stateAfter } from "../../app/stateAfter.ts";
import { selectReaderScreen } from "./readerScreenSelectors.ts";
import { initialReaderScreen } from "./readerScreenState.ts";

describe("selectReaderScreen", () => {
  it("returns the defaults while no media screen is open", () => {
    const state = { app: stateAfter(actions.readerPanelOpened("search")) };
    expect(selectReaderScreen(state)).toBe(initialReaderScreen);
  });

  it("returns the open media screen's reader", () => {
    const state = {
      app: stateAfter(
        actions.openMediaFileRequested("p1", "b1"),
        actions.readerPanelOpened("search"),
      ),
    };
    expect(selectReaderScreen(state).panel).toBe("search");
  });
});
