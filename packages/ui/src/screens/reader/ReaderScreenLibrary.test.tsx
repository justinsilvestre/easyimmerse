import { actions } from "@easyimmerse/state";
import type { Flashcard } from "@easyimmerse/types";
import {
  act,
  cleanup,
  fireEvent,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { exampleResults } from "../../components/dictionaryPopup/exampleLookup.ts";
import { exampleFlashcard } from "../../components/flashcards/exampleFlashcard.ts";
import { createFakeBackendClient } from "../../testSupport/createFakeBackendClient.ts";
import {
  exampleLibraryDocumentText,
  exampleLibraryItem,
  exampleLibraryMediaFile,
} from "../../testSupport/exampleLibrary.ts";
import {
  fixtureProject,
  fixtureResponses,
} from "../../testSupport/fixtureResponses.ts";
import {
  bodyOf,
  dictionarySummary,
  requestsTo,
} from "../../testSupport/renderMediaScreen.tsx";
import { renderWithAppStore } from "../../testSupport/renderWithAppStore.tsx";
import { ReaderScreen } from "./ReaderScreen.tsx";
import { paragraphAttribute } from "./textOffsets.ts";

const library = {
  item: exampleLibraryItem({ kind: "document", file_name: "story.txt" }),
  text: exampleLibraryDocumentText,
  isEditing: false,
};

const libraryFlashcard: Flashcard = {
  id: "f9",
  project_id: "p1",
  media_file_id: "m3",
  cue_index: 0,
  word_start: 4,
  content: { ...exampleFlashcard, word: "Hund" },
  included_fields: ["word"],
  created_at_ms: 0,
  updated_at_ms: 0,
  exported_at_ms: null,
  was_packaged: false,
  sent_at_ms: null,
  is_suspended: false,
  is_from_library: true,
};

const flashcardPath = "/projects/p1/media/m3/library-flashcards";

/** Every word is drawn in this rectangle, which the pointer lies inside. */
const point = { clientX: 10, clientY: 10 };

const restorers: (() => void)[] = [];

afterEach(() => {
  cleanup();
  for (const restore of restorers.splice(0)) restore();
});

/** Stands in for the browser's layout, which the test environment lacks. */
function override(target: object, name: string, value: unknown) {
  Object.defineProperty(target, name, { value, configurable: true });
  restorers.push(() => Reflect.deleteProperty(target, name));
}

/** Makes the point under the pointer lie on the first occurrence of `text` in the chapter. */
function pointAt(text: string) {
  const paragraph = [
    ...document.querySelectorAll(`[${paragraphAttribute}]`),
  ].find((element) => element.textContent?.includes(text));
  override(document, "caretPositionFromPoint", () => ({
    offsetNode: paragraph?.firstChild,
    offset: paragraph?.textContent?.indexOf(text) ?? 0,
  }));
  override(Range.prototype, "getClientRects", () => [
    new DOMRect(0, 0, 100, 100),
  ]);
}

function click(detail = 1) {
  const text = screen.getByRole("main");
  fireEvent.pointerDown(text, { ...point, pointerType: "mouse" });
  fireEvent.pointerUp(text, { ...point, pointerType: "mouse" });
  fireEvent.click(text, { ...point, detail });
}

/**
 * Renders the reader on the library document i1, added to project p1 as m3, over a server with German dictionaries,
 * for a learner or, while `isEditing`, for the library manager preparing it, whose dictionaries find the example results.
 */
async function renderLibraryReader(isEditing = false) {
  const client = createFakeBackendClient({
    ...fixtureResponses,
    "GET /projects/p1/media": { media_files: [exampleLibraryMediaFile] },
    "GET /dictionaries": {
      dictionaries: [dictionarySummary("wiktionary-de-en", "de", "en")],
    },
    [`POST ${flashcardPath}`]: libraryFlashcard,
    "GET /dictionaries/lookup": {
      results: [...exampleResults],
      kanji: [],
      stylesheets: [],
    },
    "PUT /library/items/i1/segments/1/words":
      exampleLibraryDocumentText.segments[1],
  });
  const rendered = renderWithAppStore(
    <ReaderScreen
      project={fixtureProject}
      mediaFileId="m3"
      library={{ ...library, isEditing }}
    />,
    client,
  );
  act(() => {
    rendered.store.dispatch(actions.preferencesLoaded({}));
    rendered.store.dispatch(actions.openMediaFileRequested("p1", "m3"));
  });
  await screen.findByRole("heading", { level: 2 });
  return client;
}

const findPopup = () => screen.findByRole("dialog", { name: "Dictionary" });

const createdFlashcard = (
  client: Awaited<ReturnType<typeof renderLibraryReader>>,
) => bodyOf(requestsTo(client.requests, "POST", flashcardPath)[0]);

describe("ReaderScreen with a document from the library", () => {
  describe("when a stored word is clicked", () => {
    it("shows the word's stored entry", async () => {
      await renderLibraryReader();
      pointAt("Hund");
      click();
      const popup = await findPopup();
      await waitFor(() => expect(popup.textContent).toContain("ein Haustier"));
    });

    it("looks nothing up on the server", async () => {
      const client = await renderLibraryReader();
      pointAt("Hund");
      click();
      await findPopup();
      expect(
        client.requests.filter(({ path }) =>
          path.startsWith("/dictionaries/lookup"),
        ),
      ).toEqual([]);
    });
  });

  it("does nothing for a click on text the library stores no word for", async () => {
    await renderLibraryReader();
    pointAt("Er");
    click();
    await act(async () => {});
    expect(screen.queryByRole("dialog", { name: "Dictionary" })).toBeNull();
  });

  it("makes a library flashcard of a double-clicked word", async () => {
    const client = await renderLibraryReader();
    pointAt("Hund");
    click(1);
    click(2);
    await waitFor(() =>
      expect(createdFlashcard(client)).toMatchObject({
        segment_index: 0,
        word_start: 4,
      }),
    );
  });

  it("makes a library flashcard of the word under the mouse on C", async () => {
    const client = await renderLibraryReader();
    pointAt("Hund");
    fireEvent.pointerMove(screen.getByRole("main"), {
      ...point,
      pointerType: "mouse",
      buttons: 0,
    });
    fireEvent.keyDown(document.body, { key: "c" });
    await waitFor(() =>
      expect(createdFlashcard(client)).toMatchObject({ word_start: 4 }),
    );
  });

  it("makes a library flashcard of the word under the mouse on E", async () => {
    const client = await renderLibraryReader();
    pointAt("Hund");
    fireEvent.pointerMove(screen.getByRole("main"), {
      ...point,
      pointerType: "mouse",
      buttons: 0,
    });
    fireEvent.keyDown(document.body, { key: "e" });
    await waitFor(() =>
      expect(createdFlashcard(client)).toMatchObject({ word_start: 4 }),
    );
  });
});

describe("ReaderScreen with a library document its library manager prepares", () => {
  /** Selects the text of the paragraph holding `text` from one offset to another, and ends the selection with a click. */
  function selectIn(text: string, from: number, to: number) {
    const paragraph = [
      ...document.querySelectorAll(`[${paragraphAttribute}]`),
    ].find((element) => element.textContent?.includes(text));
    const node = paragraph?.firstChild as Text;
    const range = document.createRange();
    range.setStart(node, from);
    range.setEnd(node, to);
    document.getSelection()?.removeAllRanges();
    document.getSelection()?.addRange(range);
    fireEvent.click(screen.getByRole("main"), { ...point, detail: 1 });
  }

  it("looks up a word the library stores no word for", async () => {
    await renderLibraryReader(true);
    pointAt("Er");
    click();
    expect(await findPopup()).toBeDefined();
  });

  it("gives selected text the entry chosen for learners", async () => {
    const client = await renderLibraryReader(true);
    selectIn("Er träumt", 0, 9);
    const popup = await findPopup();
    const [use] = await within(popup).findAllByRole("button", {
      name: "Use this entry for learners",
    });
    fireEvent.click(use as HTMLElement);
    const path = "/library/items/i1/segments/1/words";
    await waitFor(() =>
      expect(bodyOf(requestsTo(client.requests, "PUT", path)[0])).toMatchObject(
        [{ start: 0, end: 9, entry: { term: "fressen" } }],
      ),
    );
  });
});
