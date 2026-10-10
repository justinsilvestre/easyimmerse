import { describe, expect, it } from "vitest";
import { actions } from "../../app/appAction.ts";
import { initialReaderScreen } from "./readerScreenState.ts";
import { updateReaderScreen } from "./updateReaderScreen.ts";

const later = { chapterIndex: 1, paragraphIndex: 4, offset: 12 };

describe("updateReaderScreen", () => {
  it("counts every jump", () => {
    const once = updateReaderScreen(
      initialReaderScreen,
      actions.readerJumped("b1", later),
    );
    expect(
      updateReaderScreen(once, actions.readerJumped("b1", later)).jumpCount,
    ).toBe(2);
  });

  it("does not count a reported location as a jump", () => {
    expect(
      updateReaderScreen(
        initialReaderScreen,
        actions.readingLocationReported("b1", later),
      ),
    ).toBe(initialReaderScreen);
  });

  it("counts a chosen match as a jump", () => {
    expect(
      updateReaderScreen(
        initialReaderScreen,
        actions.readerMatchChosen("b1", 3, later),
      ).jumpCount,
    ).toBe(1);
  });

  it("marks the chosen match as active", () => {
    expect(
      updateReaderScreen(
        initialReaderScreen,
        actions.readerMatchChosen("b1", 3, later),
      ).search.activeMatchIndex,
    ).toBe(3);
  });

  it("forgets the chosen match when the query changes", () => {
    const chosen = updateReaderScreen(
      initialReaderScreen,
      actions.readerMatchChosen("b1", 3, later),
    );
    expect(
      updateReaderScreen(chosen, actions.readerSearchChanged("Tisch")).search
        .activeMatchIndex,
    ).toBeNull();
  });

  it("closes a panel when it is toggled again", () => {
    const open = updateReaderScreen(
      initialReaderScreen,
      actions.readerPanelToggled("contents"),
    );
    expect(
      updateReaderScreen(open, actions.readerPanelToggled("contents")).panel,
    ).toBeNull();
  });

  it("keeps a panel open when it is opened again", () => {
    const open = updateReaderScreen(
      initialReaderScreen,
      actions.readerPanelOpened("search"),
    );
    expect(
      updateReaderScreen(open, actions.readerPanelOpened("search")).panel,
    ).toBe("search");
  });

  it("keeps the chrome while a panel is open", () => {
    const open = updateReaderScreen(
      initialReaderScreen,
      actions.readerPanelToggled("search"),
    );
    expect(
      updateReaderScreen(open, actions.readerChromeHidden()).isChromeVisible,
    ).toBe(true);
  });

  it("keeps the measured span", () => {
    expect(
      updateReaderScreen(
        initialReaderScreen,
        actions.readerNearSpanMeasured({ first: 2, last: 5 }),
      ).nearSpan,
    ).toEqual({ first: 2, last: 5 });
  });
});
