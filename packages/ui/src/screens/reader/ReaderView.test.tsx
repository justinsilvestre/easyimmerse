import {
  actions,
  defaultReaderPreferences,
  initialReaderScreen,
  type ReaderPreferences,
  type ReaderScreenState,
} from "@easyimmerse/state";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  within,
} from "@testing-library/react";
import type { ComponentProps } from "react";
import { afterEach, describe, expect, it } from "vitest";
import { exampleAudioAlignment } from "./exampleAudioAlignment.ts";
import { exampleShortBook } from "./exampleDocuments.ts";
import {
  type ReaderCallbacks,
  ReaderView,
  type ReaderViewAction,
} from "./ReaderView.tsx";
import type { ReaderCursor } from "./readerCursor.ts";
import { type ReaderLocation, startOfBook } from "./readingProgress.ts";
import type { ReaderWord } from "./useWordPointer.ts";

afterEach(cleanup);

const ignore = () => undefined;

/** Renders the reader on the short example book, and returns the actions it dispatches. */
function renderReader(
  overrides: {
    location?: ReaderLocation;
    reader?: Partial<ReaderScreenState>;
    cursor?: ReaderCursor | null;
    audio?: ComponentProps<typeof ReaderView>["audio"];
    onPreferencesChange?: (preferences: ReaderPreferences) => void;
    onWordPointed?: ReaderCallbacks["onWordPointed"];
  } = {},
) {
  const dispatched: ReaderViewAction[] = [];
  render(
    <ReaderView
      mediaFileId="b1"
      document={exampleShortBook}
      location={overrides.location ?? startOfBook}
      reader={{ ...initialReaderScreen, ...overrides.reader }}
      viewMode="target"
      cursor={overrides.cursor ?? null}
      audio={overrides.audio}
      dispatch={(action) => dispatched.push(action)}
      title="Sample Book"
      projectName="English reading"
      language="en"
      preferences={{
        ...defaultReaderPreferences,
        layout: "scroll",
      }}
      callbacks={{
        onBack: ignore,
        onLookup: ignore,
        onWordClick: ignore,
        onWordDoubleClick: ignore,
        onWordPointed: overrides.onWordPointed,
        onWordHover: ignore,
        onWordHold: ignore,
        onDismissLookup: ignore,
        onPreferencesChange: overrides.onPreferencesChange ?? ignore,
      }}
    />,
  );
  return dispatched;
}

/** Renders the reader and records the words the keyboard points at, with the input that pointed. */
function renderReaderPointing(
  overrides: Parameters<typeof renderReader>[0] = {},
) {
  const pointed: [ReaderWord | null, string][] = [];
  const dispatched = renderReader({
    ...overrides,
    onWordPointed: (word, input) => pointed.push([word, input]),
  });
  return { pointed, dispatched };
}

/** The keyboard's lookup cursor on the word at the location. */
function keyboardCursorAt(location: ReaderLocation, term = "The") {
  return {
    location,
    input: "keyboard",
    term,
    isUnspaced: false,
  } satisfies ReaderCursor;
}

/** Stands in for the browser's layout, which the test environment lacks, until the test ends. */
function override(target: object, name: string, value: unknown) {
  const descriptor = Object.getOwnPropertyDescriptor(target, name);
  Object.defineProperty(target, name, { value, configurable: true });
  restorers.push(() => {
    if (descriptor) Object.defineProperty(target, name, descriptor);
    else Reflect.deleteProperty(target, name);
  });
}

const restorers: (() => void)[] = [];

afterEach(() => {
  for (const restore of restorers.splice(0)) restore();
});

const chapterTwo = { chapterIndex: 1, paragraphIndex: 0, offset: 0 };

describe("ReaderView", () => {
  it("shows the chapter at the location", () => {
    renderReader({ location: chapterTwo });
    expect(screen.getByRole("heading", { level: 2 }).textContent).toBe(
      "Chapter Two",
    );
  });

  it("asks to jump to the start of the chapter chosen from the contents", () => {
    const dispatched = renderReader({ reader: { panel: "contents" } });
    fireEvent.click(
      within(screen.getByRole("dialog")).getByRole("button", {
        name: /Chapter Two/,
      }),
    );
    expect(dispatched).toContainEqual(actions.readerJumped("b1", chapterTwo));
  });

  it("counts the search results across chapters", () => {
    renderReader({
      reader: {
        panel: "search",
        search: { query: "cat", activeMatchIndex: null },
      },
    });
    expect(screen.getByText("2 results")).toBeTruthy();
  });

  it("reports a change of theme from the appearance panel", () => {
    const changes: ReaderPreferences[] = [];
    renderReader({
      reader: { panel: "appearance" },
      onPreferencesChange: (change) => changes.push(change),
    });
    fireEvent.click(screen.getByRole("radio", { name: "Sepia" }));
    expect(changes.map((change) => change.theme)).toEqual(["sepia"]);
  });

  // Without a layout engine no word is found under the pointer, so a click counts as a tap beside the words.
  it("asks to show or hide the toolbar on a tap beside the words", () => {
    const dispatched = renderReader();
    fireEvent.click(screen.getByRole("main"));
    expect(dispatched).toContainEqual(actions.readerChromeToggled());
  });

  describe("when the toolbar is hidden", () => {
    const hidden = { reader: { isChromeVisible: false } };

    it("keeps the back button reachable by keyboard", () => {
      renderReader(hidden);
      const back = screen.getByRole("button", {
        name: "Back to English reading",
      });
      expect(back.closest("[inert]")).toBeNull();
    });

    it("keeps the progress slider reachable by keyboard", () => {
      renderReader(hidden);
      const slider = screen.getByRole("slider");
      expect(slider.closest("[inert]")).toBeNull();
    });
  });

  describe("in the scrolling layout", () => {
    it("gives the text the keyboard on opening, so that the scrolling keys work at once", () => {
      renderReader();
      expect(document.activeElement).toBe(
        screen.getByRole("main").firstElementChild,
      );
    });
  });

  describe("with the keyboard's lookup cursor", () => {
    const main = () => screen.getByRole("main", { name: "Text" });
    const secondParagraph = { chapterIndex: 0, paragraphIndex: 1, offset: 0 };

    it("reaches the text as one region with Tab", () => {
      renderReader();
      expect(main().tabIndex).toBe(0);
    });

    it("tells the store when the text gains focus from the keyboard", () => {
      const dispatched = renderReader();
      fireEvent.focus(main());
      expect(dispatched).toContainEqual(actions.readerTextFocused());
    });

    it("does not count a focus that a pointer press gives the text", () => {
      const dispatched = renderReader();
      fireEvent.pointerDown(main(), { pointerType: "mouse" });
      fireEvent.focus(main());
      expect(dispatched).not.toContainEqual(actions.readerTextFocused());
    });

    it("points at the first word of the page while a placement at the page's start waits", () => {
      const { pointed } = renderReaderPointing({
        reader: { pendingCursor: { kind: "pageStart" } },
      });
      expect(pointed).toEqual([
        [
          expect.objectContaining({ text: "The", location: startOfBook }),
          "keyboard",
        ],
      ]);
    });

    it("points at the first word after the reading location when it lies on a space", () => {
      const { pointed } = renderReaderPointing({
        location: { chapterIndex: 0, paragraphIndex: 0, offset: 3 },
        reader: { pendingCursor: { kind: "pageStart" } },
      });
      expect(pointed[0]?.[0]?.text).toBe("cat");
    });

    it("points at the last word of the chapter while a placement at the page's end waits", () => {
      const { pointed } = renderReaderPointing({
        reader: { pendingCursor: { kind: "pageEnd" } },
      });
      expect(pointed[0]?.[0]?.text).toBe("hungry");
    });

    it("points at the sentence being spoken while a placement on it waits", () => {
      const audioContent = exampleAudioAlignment("a1").content;
      const spokenSpan =
        audioContent.kind === "audio"
          ? (audioContent.segments[1]?.span ?? null)
          : null;
      const { pointed } = renderReaderPointing({
        reader: { pendingCursor: { kind: "spoken" } },
        audio: {
          bar: null,
          spokenSpan,
          isPlaying: true,
          playAt: ignore,
          hasSegmentAt: () => true,
        },
      });
      expect(pointed[0]?.[0]?.location).toEqual(secondParagraph);
    });

    it("points at the word a step landed on", () => {
      const { pointed } = renderReaderPointing({
        reader: { pendingCursor: { kind: "at", location: secondParagraph } },
      });
      expect(pointed[0]?.[0]?.sentence).toBe(
        "The dog wants to eat, and it is hungry.",
      );
    });

    it("measures where the word is drawn, so that the pop-up can stand beside it", () => {
      override(
        Range.prototype,
        "getBoundingClientRect",
        () => new DOMRect(0, 0, 30, 20),
      );
      const { pointed } = renderReaderPointing({
        reader: { pendingCursor: { kind: "pageStart" } },
      });
      expect(pointed[0]?.[0]?.rect.width).toBe(30);
    });

    it("jumps to a word that lies out of view before pointing at it", () => {
      override(Range.prototype, "getClientRects", () => [
        new DOMRect(500, 500, 30, 20),
      ]);
      const { dispatched } = renderReaderPointing({
        reader: { pendingCursor: { kind: "at", location: secondParagraph } },
      });
      expect(dispatched).toContainEqual(
        actions.readerJumped("b1", secondParagraph),
      );
    });

    it("waits for the jump to bring the word into view before pointing at it", () => {
      override(Range.prototype, "getClientRects", () => [
        new DOMRect(500, 500, 30, 20),
      ]);
      const { pointed } = renderReaderPointing({
        reader: { pendingCursor: { kind: "at", location: secondParagraph } },
      });
      expect(pointed).toEqual([]);
    });

    it("takes the cursor away when focus leaves the text", () => {
      const { pointed } = renderReaderPointing({
        cursor: keyboardCursorAt(startOfBook),
      });
      fireEvent.blur(main(), { relatedTarget: document.body });
      expect(pointed).toEqual([[null, "keyboard"]]);
    });

    it("keeps the cursor when focus moves within the text", () => {
      const { pointed } = renderReaderPointing({
        cursor: keyboardCursorAt(startOfBook),
      });
      fireEvent.blur(main(), { relatedTarget: main().firstElementChild });
      expect(pointed).toEqual([]);
    });

    it("announces the character the cursor looks up from in a script written without spaces", () => {
      renderReader({
        cursor: {
          ...keyboardCursorAt(startOfBook, "映画を"),
          isUnspaced: true,
        },
      });
      expect(screen.getByText("Looks up from 映")).toBeDefined();
    });

    it("announces nothing for a word written with spaces", () => {
      renderReader({ cursor: keyboardCursorAt(startOfBook) });
      expect(screen.queryByText(/Looks up from/)).toBeNull();
    });
  });
});
