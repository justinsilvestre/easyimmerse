import type { Alignment, Document, MediaFile } from "@easyimmerse/types";
import { describe, expect, it } from "vitest";
import type { AppAction } from "../../app/appAction.ts";
import { actions } from "../../app/appAction.ts";
import { stateAfter, stateAfterWithCache } from "../../app/stateAfter.ts";
import { startNew } from "../../flashcards/flashcardsTestSupport.ts";
import type { ServerCacheSlice } from "../../server/cacheEntry.ts";
import { exampleMediaFile } from "../../server/exampleMediaFile.ts";
import {
  emptyServerCache,
  serverCacheWith,
} from "../../server/serverCacheWith.ts";
import {
  selectIsReaderPaged,
  selectIsReaderPanelOpen,
  selectReaderScreen,
  selectReaderTranslationStatus,
  selectShownReaderViewMode,
} from "./readerScreenSelectors.ts";
import { initialReaderScreen } from "./readerScreenState.ts";

const openBook = actions.openMediaFileRequested("p1", "b1");

const translation: MediaFile = exampleMediaFile("t1", "translation.txt");
const pairedBook: MediaFile = {
  ...exampleMediaFile("b1", "sample.epub"),
  translation_media_file_id: "t1",
};
const translationText: Document = {
  title: "",
  language: "es",
  chapters: [{ title: null, paragraphs: ["El gato duerme."] }],
};

/** The book's translation alignment with the media file of the given id. */
function alignmentWith(translationMediaFileId: string): Alignment {
  return {
    id: "al1",
    media_file_id: "b1",
    provider: null,
    created_at_ms: 0,
    content: {
      kind: "translation",
      translation_media_file_id: translationMediaFileId,
      links: [],
    },
  };
}

/** The server cache with the book paired with its translation, and optionally the translation's text and the book's alignments. */
function cacheWith({
  isTextCached = true,
  alignments = [],
}: {
  isTextCached?: boolean;
  alignments?: Alignment[];
} = {}) {
  const listed = serverCacheWith(
    "listAlignments",
    { projectId: "p1", mediaFileId: "b1" },
    { alignments },
    serverCacheWith("listMediaFiles", "p1", {
      media_files: [pairedBook, translation],
    }),
  );
  return isTextCached
    ? serverCacheWith(
        "openBook",
        { name: translation.name, source: translation.source },
        translationText,
        listed,
      )
    : listed;
}

/** The reader on b1 after the given actions, reading the given server cache. */
const reading = (backend: ServerCacheSlice, ...done: AppAction[]) => ({
  app: stateAfterWithCache(backend, openBook, ...done),
  backend,
});

const pagedLayout = actions.preferencesLoaded({
  readerPreferences: JSON.stringify({ layout: "pages" }),
});

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

describe("selectReaderTranslationStatus", () => {
  it("tells that no translation is ready while the project's media files are not cached", () => {
    expect(selectReaderTranslationStatus(reading(emptyServerCache))).toBe(
      "absent",
    );
  });

  it("tells that no translation is ready while the book is paired with none", () => {
    const backend = serverCacheWith("listMediaFiles", "p1", {
      media_files: [exampleMediaFile("b1", "sample.epub"), translation],
    });
    expect(selectReaderTranslationStatus(reading(backend))).toBe("absent");
  });

  it("tells that no translation is ready while the paired one's text is not cached", () => {
    const backend = cacheWith({ isTextCached: false });
    expect(selectReaderTranslationStatus(reading(backend))).toBe("absent");
  });

  it("tells that a cached translation without an alignment is ready to be shown alone", () => {
    expect(selectReaderTranslationStatus(reading(cacheWith()))).toBe(
      "unaligned",
    );
  });

  it("tells that a cached translation aligned with the book is aligned", () => {
    const backend = cacheWith({ alignments: [alignmentWith("t1")] });
    expect(selectReaderTranslationStatus(reading(backend))).toBe("aligned");
  });

  it("counts an alignment with another translation as none", () => {
    const backend = cacheWith({ alignments: [alignmentWith("t2")] });
    expect(selectReaderTranslationStatus(reading(backend))).toBe("unaligned");
  });

  it("tells that no translation is ready while no media screen is open", () => {
    const state = { app: stateAfter(), backend: cacheWith() };
    expect(selectReaderTranslationStatus(state)).toBe("absent");
  });
});

describe("selectIsReaderPaged", () => {
  const withStored = (readerPreferences: string) => ({
    app: stateAfter(actions.preferencesLoaded({ readerPreferences })),
    backend: emptyServerCache,
  });

  it("tells that the text is paged until a layout is stored", () => {
    expect(selectIsReaderPaged(reading(emptyServerCache))).toBe(true);
  });

  it("tells that the text scrolls in the scrolling layout", () => {
    const root = withStored(JSON.stringify({ layout: "scroll" }));
    expect(selectIsReaderPaged(root)).toBe(false);
  });

  it("tells that the text is paged in the paged layout", () => {
    const root = withStored(JSON.stringify({ layout: "pages" }));
    expect(selectIsReaderPaged(root)).toBe(true);
  });

  it("tells that the text is paged when the stored preferences cannot be read", () => {
    expect(selectIsReaderPaged(withStored("{"))).toBe(true);
  });

  it("tells that the parallel view scrolls in the paged layout", () => {
    const root = reading(
      cacheWith({ alignments: [alignmentWith("t1")] }),
      actions.readerViewModeChosen("parallel"),
      pagedLayout,
    );
    expect(selectIsReaderPaged(root)).toBe(false);
  });

  it("tells that the text is paged where the parallel view is chosen but the book is shown alone", () => {
    const root = reading(
      cacheWith(),
      actions.readerViewModeChosen("parallel"),
      pagedLayout,
    );
    expect(selectIsReaderPaged(root)).toBe(true);
  });
});

describe("selectShownReaderViewMode", () => {
  it("shows the book alone while no media screen is open", () => {
    const state = { app: stateAfter(), backend: emptyServerCache };
    expect(selectShownReaderViewMode(state)).toBe("target");
  });

  it("shows the chosen view once the translation it needs is ready", () => {
    const root = reading(
      cacheWith({ alignments: [alignmentWith("t1")] }),
      actions.readerViewModeChosen("interlinear"),
    );
    expect(selectShownReaderViewMode(root)).toBe("interlinear");
  });

  it("shows the book alone while the chosen translation has not loaded", () => {
    const root = reading(
      cacheWith({ isTextCached: false }),
      actions.readerViewModeChosen("translation"),
    );
    expect(selectShownReaderViewMode(root)).toBe("target");
  });

  it("shows the translation alone once it has loaded unaligned", () => {
    const root = reading(
      cacheWith(),
      actions.readerViewModeChosen("translation"),
    );
    expect(selectShownReaderViewMode(root)).toBe("translation");
  });

  it("shows the book alone where a view of both texts is chosen but the translation is not aligned", () => {
    const root = reading(
      cacheWith(),
      actions.readerViewModeChosen("interlinear"),
    );
    expect(selectShownReaderViewMode(root)).toBe("target");
  });
});
