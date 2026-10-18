import { describe, expect, it } from "vitest";
import { actions } from "../../app/appAction.ts";
import { stateAfter } from "../../app/stateAfter.ts";
import { startNew } from "../../flashcards/flashcardsTestSupport.ts";
import {
  selectIsReaderPaged,
  selectIsReaderPanelOpen,
  selectReaderScreen,
  selectShownReaderViewMode,
} from "./readerScreenSelectors.ts";
import { initialReaderScreen } from "./readerScreenState.ts";

const openBook = actions.openMediaFileRequested("p1", "b1");

describe("selectReaderScreen", () => {
  it("returns the defaults while no media screen is open", () => {
    const state = { app: stateAfter(actions.readerPanelOpened("search")) };
    expect(selectReaderScreen(state)).toBe(initialReaderScreen);
  });

  it("returns the open media screen's reader", () => {
    const state = {
      app: stateAfter(openBook, actions.readerPanelOpened("search")),
    };
    expect(selectReaderScreen(state).panel).toBe("search");
  });
});

describe("selectIsReaderPanelOpen", () => {
  it("tells that no panel is open on a book just opened", () => {
    expect(selectIsReaderPanelOpen(stateAfter(openBook))).toBe(false);
  });

  it("tells that a panel is open", () => {
    const app = stateAfter(openBook, actions.readerPanelOpened("contents"));
    expect(selectIsReaderPanelOpen(app)).toBe(true);
  });

  it("counts the flashcard editor as a panel", () => {
    const app = stateAfter(openBook, startNew("f1"));
    expect(selectIsReaderPanelOpen(app)).toBe(true);
  });
});

describe("selectIsReaderPaged", () => {
  const withStored = (readerPreferences: string) =>
    stateAfter(actions.preferencesLoaded({ readerPreferences }));

  it("tells that the text is paged until a layout is stored", () => {
    expect(selectIsReaderPaged(stateAfter())).toBe(true);
  });

  it("tells that the text scrolls in the scrolling layout", () => {
    const app = withStored(JSON.stringify({ layout: "scroll" }));
    expect(selectIsReaderPaged(app)).toBe(false);
  });

  it("tells that the text is paged in the paged layout", () => {
    const app = withStored(JSON.stringify({ layout: "pages" }));
    expect(selectIsReaderPaged(app)).toBe(true);
  });

  it("tells that the text is paged when the stored preferences cannot be read", () => {
    expect(selectIsReaderPaged(withStored("{"))).toBe(true);
  });

  it("tells that the parallel view scrolls in the paged layout", () => {
    const app = stateAfter(
      openBook,
      actions.readerTranslationStatusReported("aligned"),
      actions.readerViewModeChosen("parallel"),
      actions.preferencesLoaded({
        readerPreferences: JSON.stringify({ layout: "pages" }),
      }),
    );
    expect(selectIsReaderPaged(app)).toBe(false);
  });

  it("tells that the text is paged where the parallel view is chosen but the book is shown alone", () => {
    const app = stateAfter(
      openBook,
      actions.readerTranslationStatusReported("unaligned"),
      actions.readerViewModeChosen("parallel"),
      actions.preferencesLoaded({
        readerPreferences: JSON.stringify({ layout: "pages" }),
      }),
    );
    expect(selectIsReaderPaged(app)).toBe(true);
  });
});

describe("selectShownReaderViewMode", () => {
  it("shows the book alone while no media screen is open", () => {
    expect(selectShownReaderViewMode(stateAfter())).toBe("target");
  });

  it("shows the chosen view once the translation it needs is ready", () => {
    const app = stateAfter(
      openBook,
      actions.readerTranslationStatusReported("aligned"),
      actions.readerViewModeChosen("interlinear"),
    );
    expect(selectShownReaderViewMode(app)).toBe("interlinear");
  });

  it("shows the book alone while the chosen translation has not loaded", () => {
    const app = stateAfter(
      openBook,
      actions.readerViewModeChosen("translation"),
    );
    expect(selectShownReaderViewMode(app)).toBe("target");
  });

  it("shows the translation alone once it has loaded unaligned", () => {
    const app = stateAfter(
      openBook,
      actions.readerTranslationStatusReported("unaligned"),
      actions.readerViewModeChosen("translation"),
    );
    expect(selectShownReaderViewMode(app)).toBe("translation");
  });

  it("shows the book alone where a view of both texts is chosen but the translation is not aligned", () => {
    const app = stateAfter(
      openBook,
      actions.readerTranslationStatusReported("unaligned"),
      actions.readerViewModeChosen("interlinear"),
    );
    expect(selectShownReaderViewMode(app)).toBe("target");
  });
});
