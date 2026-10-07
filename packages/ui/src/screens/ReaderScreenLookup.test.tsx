import { resetBackend } from "@easyimmerse/backend";
import { actions } from "@easyimmerse/state";
import type { LookupResponse, MediaFile } from "@easyimmerse/types";
import {
  act,
  cleanup,
  fireEvent,
  screen,
  within,
} from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { exampleResults } from "../lookup/exampleLookup.ts";
import { exampleShortBook } from "../reader/exampleDocuments.ts";
import { paragraphAttribute } from "../reader/textOffsets.ts";
import { createFakeBackendClient } from "../testSupport/createFakeBackendClient.ts";
import {
  fixtureProject,
  fixtureResponses,
} from "../testSupport/fixtureResponses.ts";
import {
  dictionarySummary,
  requestsTo,
} from "../testSupport/renderMediaScreen.tsx";
import { renderWithAppStore } from "../testSupport/renderWithAppStore.tsx";
import { ReaderScreen } from "./ReaderScreen.tsx";

const bookFile: MediaFile = {
  id: "b1",
  project_id: "p1",
  name: "sample.epub",
  source: { kind: "path", path: "/books/sample.epub" },
  created_at_ms: 0,
  track_selection_json: null,
};

const lookupResponse: LookupResponse = {
  results: [...exampleResults],
  kanji: [],
  stylesheets: [],
};

/** Every word is drawn in this rectangle, which the pointer lies inside. */
const point = { clientX: 10, clientY: 10 };

const restorers: (() => void)[] = [];

afterEach(() => {
  cleanup();
  resetBackend();
  for (const restore of restorers.splice(0)) restore();
});

/** Stands in for the browser's layout, which the test environment lacks. */
function override(target: object, name: string, value: unknown) {
  Object.defineProperty(target, name, { value, configurable: true });
  restorers.push(() => Reflect.deleteProperty(target, name));
}

/** Makes the point under the pointer lie on the first occurrence of `word` in the chapter. */
function pointAt(word: string) {
  const paragraph = [
    ...document.querySelectorAll(`[${paragraphAttribute}]`),
  ].find((element) => element.textContent?.includes(word));
  const node = paragraph?.firstChild;
  const offset = paragraph?.textContent?.indexOf(word) ?? 0;
  override(document, "caretPositionFromPoint", () => ({
    offsetNode: node,
    offset,
  }));
  override(Range.prototype, "getClientRects", () => [
    new DOMRect(0, 0, 100, 100),
  ]);
}

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
    rendered.store.dispatch(actions.openMedia(bookFile.id));
  });
  await screen.findByRole("heading", { level: 2 });
  return { ...rendered, client };
}

function click(detail = 1) {
  const text = screen.getByRole("main");
  fireEvent.pointerDown(text, { ...point, pointerType: "mouse" });
  fireEvent.click(text, { ...point, detail });
}

function restMouse() {
  fireEvent.pointerMove(screen.getByRole("main"), {
    ...point,
    pointerType: "mouse",
  });
  return act(() => new Promise((resolve) => setTimeout(resolve, 250)));
}

const findPopup = () => screen.findByRole("dialog", { name: "Dictionary" });
const queryPopup = () => screen.queryByRole("dialog", { name: "Dictionary" });

const lookupQueries = (client: ReturnType<typeof createFakeBackendClient>) =>
  requestsTo(client.requests, "GET", "/dictionaries/lookup").map(
    (request) => request.query,
  );

describe("ReaderScreen lookup", () => {
  it("opens the dictionary pop-up on a clicked word", async () => {
    await renderReader();
    pointAt("cat");
    click();
    expect(await findPopup()).toBeDefined();
  });

  it("looks a clicked word up with its sentence as context", async () => {
    const { client } = await renderReader();
    pointAt("cat");
    click();
    await findPopup();
    expect(lookupQueries(client)[0]).toMatchObject({
      text: "cat is sleeping on the windowsill.",
      context: "The cat is sleeping on the windowsill.",
      offset: "4",
    });
  });

  it("does not open the pop-up for a word the mouse rests on", async () => {
    await renderReader();
    pointAt("cat");
    await restMouse();
    expect(queryPopup()).toBeNull();
  });

  it("moves an open pop-up to a word the mouse rests on", async () => {
    const { client } = await renderReader();
    pointAt("cat");
    click();
    await findPopup();
    pointAt("windowsill");
    await restMouse();
    expect(lookupQueries(client).at(-1)?.text).toBe("windowsill.");
  });

  it("moves an open pop-up to another clicked word", async () => {
    await renderReader();
    pointAt("cat");
    click();
    await findPopup();
    pointAt("windowsill");
    click();
    const popup = await findPopup();
    await vi.waitFor(() =>
      expect(
        within(popup).getByRole<HTMLInputElement>("textbox", {
          name: "Word to look up",
        }).value,
      ).toBe("windowsill"),
    );
  });

  it("closes the pop-up on a click beside the words", async () => {
    await renderReader();
    pointAt("cat");
    click();
    await findPopup();
    override(document, "caretPositionFromPoint", () => null);
    click();
    expect(queryPopup()).toBeNull();
  });

  it("opens the pop-up's search field with the L key", async () => {
    await renderReader();
    fireEvent.keyDown(document.body, { key: "l" });
    expect(
      within(await findPopup()).getByLabelText("Word to look up"),
    ).toBeDefined();
  });

  it("looks up the word under the mouse with the L key", async () => {
    await renderReader();
    pointAt("cat");
    fireEvent.pointerMove(screen.getByRole("main"), {
      ...point,
      pointerType: "mouse",
    });
    fireEvent.keyDown(document.body, { key: "l" });
    const popup = await findPopup();
    await vi.waitFor(() =>
      expect(
        within(popup).getByRole<HTMLInputElement>("textbox", {
          name: "Word to look up",
        }).value,
      ).toBe("cat"),
    );
  });

  it("starts a flashcard filled from the lookup on a double-click", async () => {
    await renderReader();
    pointAt("cat");
    click(1);
    click(2);
    await screen.findByRole("form", { name: "Flashcard" });
    expect(
      (screen.getByLabelText("Word (de)") as HTMLTextAreaElement).value,
    ).toBe("fressen");
  });
});
