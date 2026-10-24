import { actions } from "@easyimmerse/state";
import type { LookupResponse, MediaFile } from "@easyimmerse/types";
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
import { createFakeBackendClient } from "../../testSupport/createFakeBackendClient.ts";
import {
  fixtureProject,
  fixtureResponses,
} from "../../testSupport/fixtureResponses.ts";
import {
  dictionarySummary,
  findCreatedDraft,
} from "../../testSupport/renderMediaScreen.tsx";
import { renderWithAppStore } from "../../testSupport/renderWithAppStore.tsx";
import { exampleShortBook } from "./exampleDocuments.ts";
import { ReaderScreen } from "./ReaderScreen.tsx";

const bookFile: MediaFile = {
  id: "b1",
  project_id: "p1",
  name: "sample.epub",
  source: { kind: "path", path: "/books/sample.epub" },
  created_at_ms: 0,
  track_selection_json: null,
  origin: null,
  translation_media_file_id: null,
  is_upload_chosen: false,
  has_stored_copy: false,
};

const lookupResponse: LookupResponse = {
  results: [...exampleResults],
  kanji: [],
  stylesheets: [],
};

afterEach(cleanup);

/** Renders the reader on the short example book, with a dictionary that answers every lookup with the example results. */
async function renderReader() {
  const client = createFakeBackendClient({
    ...fixtureResponses,
    "GET /projects/p1/media": { media_files: [bookFile] },
    "POST /documents/parse-local": exampleShortBook,
    "GET /dictionaries": {
      dictionaries: [dictionarySummary("wiktionary-de-en", "de", "en")],
    },
    "GET /dictionaries/lookup": lookupResponse,
  });
  const rendered = renderWithAppStore(
    <ReaderScreen project={fixtureProject} mediaFileId={bookFile.id} />,
    client,
  );
  act(() => {
    rendered.store.dispatch(actions.preferencesLoaded({}));
    rendered.store.dispatch(
      actions.openMediaFileRequested(fixtureProject.id, bookFile.id),
    );
  });
  await screen.findByRole("heading", { level: 2 });
  return { ...rendered, client };
}

/** Gives the text keyboard focus, as Tab would, and presses the keys on whatever has focus after each. */
function focusTextAndPress(...keys: string[]) {
  act(() => screen.getByRole("main", { name: "Text" }).focus());
  for (const key of keys)
    fireEvent.keyDown(document.activeElement ?? document.body, { key });
}

const findPopup = () => screen.findByRole("dialog", { name: "Dictionary" });

/** The word the pop-up's field holds, once the pop-up is open. */
async function popupWord() {
  const popup = await findPopup();
  return within(popup).getByRole<HTMLInputElement>("textbox", {
    name: "Word to look up",
  }).value;
}

describe("ReaderScreen lookup cursor", () => {
  it("looks up the first word of the page with L once the text has focus", async () => {
    await renderReader();
    focusTextAndPress("l");
    await waitFor(async () => expect(await popupWord()).toBe("The"));
  });

  it("moves the cursor to the next word on Right, which L looks up", async () => {
    await renderReader();
    focusTextAndPress("ArrowRight", "l");
    await waitFor(async () => expect(await popupWord()).toBe("cat"));
  });

  it("moves the cursor back to the previous word on Left", async () => {
    await renderReader();
    focusTextAndPress("ArrowRight", "ArrowRight", "ArrowLeft", "l");
    await waitFor(async () => expect(await popupWord()).toBe("cat"));
  });

  it("moves the cursor to the next sentence on Down", async () => {
    await renderReader();
    focusTextAndPress("ArrowDown", "ArrowRight", "l");
    await waitFor(async () => expect(await popupWord()).toBe("dog"));
  });

  it("opens the pop-up on the cursor's word with Enter", async () => {
    await renderReader();
    focusTextAndPress("ArrowRight", "Enter");
    await waitFor(async () => expect(await popupWord()).toBe("cat"));
  });

  it("saves a flashcard from the cursor's word on C", async () => {
    const { client } = await renderReader();
    focusTextAndPress("ArrowRight", "c");
    expect((await findCreatedDraft(client)).content.word).toBe("fressen");
  });

  it("opens the search field with L once Escape has taken the cursor away", async () => {
    await renderReader();
    focusTextAndPress("Escape", "l");
    await waitFor(async () => expect(await popupWord()).toBe(""));
  });

  it("moves on through the book with Right once Escape has taken the cursor away", async () => {
    await renderReader();
    focusTextAndPress("Escape", "ArrowRight");
    await waitFor(() =>
      expect(screen.getByRole("heading", { level: 2 }).textContent).toBe(
        "Chapter Two",
      ),
    );
  });

  it("takes the cursor away when focus leaves the text", async () => {
    await renderReader();
    focusTextAndPress("ArrowRight");
    act(() => screen.getByRole("button", { name: /^Back to/ }).focus());
    fireEvent.keyDown(document.activeElement ?? document.body, { key: "l" });
    await waitFor(async () => expect(await popupWord()).toBe(""));
  });
});
