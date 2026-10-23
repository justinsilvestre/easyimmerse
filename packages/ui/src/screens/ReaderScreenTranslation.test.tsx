import type { BackendRequest } from "@easyimmerse/backend";
import { actions } from "@easyimmerse/state";
import type {
  InstalledPlugin,
  LookupResponse,
  MediaFile,
  ParseLocalDocumentRequest,
} from "@easyimmerse/types";
import {
  act,
  cleanup,
  fireEvent,
  screen,
  within,
} from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { exampleResults } from "../lookup/exampleLookup.ts";
import {
  exampleShortBook,
  exampleShortBookAlignment,
  exampleShortBookTranslation,
} from "../reader/exampleDocuments.ts";
import { translatedHighlightName } from "../reader/readerTextHighlights.ts";
import {
  paragraphAttribute,
  translationAttribute,
} from "../reader/textOffsets.ts";
import { createFakeBackendClient } from "../testSupport/createFakeBackendClient.ts";
import {
  fixtureProject,
  fixtureResponses,
} from "../testSupport/fixtureResponses.ts";
import {
  bodyOf,
  dictionarySummary,
  findCreatedDraft,
  requestsTo,
  savedFlashcard,
} from "../testSupport/renderMediaScreen.tsx";
import {
  type RenderOptions,
  renderWithAppStore,
} from "../testSupport/renderWithAppStore.tsx";
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

const translationFile: MediaFile = {
  ...bookFile,
  id: "t1",
  name: "sample-translation.txt",
  source: { kind: "path", path: "/books/sample-translation.txt" },
};

const audioFile: MediaFile = {
  ...bookFile,
  id: "m2",
  name: "interview.mp3",
  source: { kind: "path", path: "/audio/interview.mp3" },
};

const alignmentPlugin: InstalledPlugin = {
  name: "aligner",
  title: "Sentence aligner",
  version: "0.1.0",
  kind: "alignment",
  import_label: null,
};

const lookupResponse: LookupResponse = {
  results: [...exampleResults],
  kanji: [],
  stylesheets: [],
};

/** Every word is drawn in this rectangle, which the pointer lies inside. */
const point = { clientX: 10, clientY: 10 };

/** A highlight as the CSS Custom Highlight API keeps it, for a test environment that lacks the API. */
class FakeHighlight {
  readonly ranges: Range[];
  priority = 0;
  constructor(...ranges: Range[]) {
    this.ranges = ranges;
  }
}

const highlights = new Map<string, FakeHighlight>();
const restorers: (() => void)[] = [];

beforeEach(() => {
  vi.stubGlobal("CSS", { highlights });
  vi.stubGlobal("Highlight", FakeHighlight);
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  highlights.clear();
  for (const restore of restorers.splice(0)) restore();
});

/** Stands in for the browser's layout, which the test environment lacks. */
function override(target: object, name: string, value: unknown) {
  Object.defineProperty(target, name, { value, configurable: true });
  restorers.push(() => Reflect.deleteProperty(target, name));
}

/** Makes the point under the pointer lie on the first occurrence of `word` in the book's own text. */
function pointAt(word: string) {
  const paragraph = [
    ...document.querySelectorAll(`[${paragraphAttribute}]`),
  ].find((element) => element.firstChild?.textContent?.includes(word));
  const node = paragraph?.firstChild;
  const offset = node?.textContent?.indexOf(word) ?? 0;
  override(document, "caretPositionFromPoint", () => ({
    offsetNode: node,
    offset,
  }));
  override(Range.prototype, "getClientRects", () => [
    new DOMRect(0, 0, 100, 100),
  ]);
}

/** Answers a parse with the book or its translation, by the path of the file. */
function parsed(request: BackendRequest) {
  const { path } = bodyOf(request) as ParseLocalDocumentRequest;
  return path.endsWith("sample-translation.txt")
    ? exampleShortBookTranslation
    : exampleShortBook;
}

/**
 * Renders the reader on the short example book, in a project that also holds its Spanish translation unless `others` says otherwise.
 * The book starts paired with the translation when `isPaired` is set, and aligned with it when `isAligned` is.
 * Pairing in the panel changes what the server lists.
 */
async function renderReader({
  isPaired = false,
  isAligned = false,
  others = [translationFile, audioFile],
  plugins = [],
  options = {},
}: {
  isPaired?: boolean;
  isAligned?: boolean;
  others?: MediaFile[];
  plugins?: InstalledPlugin[];
  options?: RenderOptions;
} = {}) {
  let pairedId = isPaired || isAligned ? translationFile.id : null;
  const listed = () => [
    { ...bookFile, translation_media_file_id: pairedId },
    ...others,
  ];
  const client = createFakeBackendClient({
    ...fixtureResponses,
    "GET /plugins": { plugins },
    "GET /projects/p1/media": () => ({ media_files: listed() }),
    "PUT /projects/p1/media/b1/translation-document": (
      request: BackendRequest,
    ) => {
      pairedId = (bodyOf(request) as { translation_media_file_id: string })
        .translation_media_file_id;
      return listed()[0];
    },
    "GET /projects/p1/media/b1/alignments": {
      alignments: isAligned
        ? [exampleShortBookAlignment(bookFile.id, translationFile.id)]
        : [],
    },
    "POST /documents/parse-local": parsed,
    "GET /dictionaries": {
      dictionaries: [dictionarySummary("wiktionary-de-en", "de", "en")],
    },
    "GET /dictionaries/lookup": lookupResponse,
    "POST /projects/p1/flashcards": savedFlashcard,
  });
  const rendered = renderWithAppStore(
    <ReaderScreen project={fixtureProject} mediaFileId={bookFile.id} />,
    client,
    options,
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

const openPanel = () =>
  fireEvent.click(screen.getByRole("button", { name: "Translation" }));

const panel = () => screen.getByRole("dialog", { name: "Translation" });

/** Opens the translation panel and chooses a view in it, once the translation has loaded. */
async function chooseView(name: RegExp) {
  openPanel();
  fireEvent.click(await within(panel()).findByRole("radio", { name }));
}

function click(detail = 1) {
  const text = screen.getByRole("main");
  fireEvent.pointerDown(text, { ...point, pointerType: "mouse", button: 0 });
  fireEvent.pointerUp(text, { ...point, pointerType: "mouse", button: 0 });
  fireEvent.click(text, { ...point, detail });
}

/** Moves the mouse onto the word pointed at, which places the lookup cursor there. */
function pointMouse() {
  fireEvent.pointerMove(screen.getByRole("main"), {
    ...point,
    pointerType: "mouse",
    buttons: 0,
  });
}

/** Holds the mouse button down on the word pointed at, for as long as a held tap. */
function holdMouse() {
  fireEvent.pointerDown(screen.getByRole("main"), {
    ...point,
    pointerType: "mouse",
    button: 0,
  });
}

const lookupQueries = (client: ReturnType<typeof createFakeBackendClient>) =>
  requestsTo(client.requests, "GET", "/dictionaries/lookup").map(
    (request) => request.query,
  );

const sentence = "The cat is sleeping on the windowsill.";
const dogSentence = "The dog wants to eat, and it is hungry.";
const dogTranslation = "El perro quiere comer. Tiene hambre.";

/** Renders the reader on the book aligned with its translation, and waits for the translation, which the sentence row shows. */
async function renderAligned() {
  const rendered = await renderReader({ isAligned: true });
  openPanel();
  await within(panel()).findByRole("radio", { name: /^Interlinear/ });
  fireEvent.click(within(panel()).getByRole("button", { name: "Close" }));
  return rendered;
}

const findPopup = () =>
  screen.findByRole("dialog", { name: "Dictionary" }, { timeout: 2000 });

/** The text the translated-sentence highlight covers, or null when nothing is highlighted. */
const translatedText = () =>
  highlights.get(translatedHighlightName)?.ranges[0]?.toString() ?? null;

const flashcardRequests = (
  client: ReturnType<typeof createFakeBackendClient>,
) => requestsTo(client.requests, "POST", "/projects/p1/flashcards");

/** The element of the book's paragraph that holds the text. */
const paragraphHolding = (text: string) =>
  [...document.querySelectorAll(`[${paragraphAttribute}]`)].find((element) =>
    element.textContent?.startsWith(text),
  );

describe("ReaderScreen translation", () => {
  it("pairs the book with a translation chosen in the panel", async () => {
    await renderReader();
    openPanel();
    fireEvent.click(
      within(panel()).getByRole("button", { name: "sample-translation.txt" }),
    );
    expect(
      await within(panel()).findByRole("button", { name: "Remove" }),
    ).toBeDefined();
  });

  it("offers only the project's other ebooks and text files", async () => {
    await renderReader();
    openPanel();
    expect(
      within(panel())
        .getAllByRole("button", { name: /\./ })
        .map((button) => button.textContent),
    ).toEqual(["sample-translation.txt"]);
  });

  it("says so when the project has no other ebook or text file", async () => {
    await renderReader({ others: [audioFile] });
    openPanel();
    expect(
      within(panel()).getByText(/no other ebook or text file/),
    ).toBeDefined();
  });

  it("removes the pairing from the panel", async () => {
    const { client } = await renderReader({ isPaired: true });
    openPanel();
    fireEvent.click(
      await within(panel()).findByRole("button", { name: "Remove" }),
    );
    await vi.waitFor(() =>
      expect(
        bodyOf(
          requestsTo(
            client.requests,
            "PUT",
            "/projects/p1/media/b1/translation-document",
          )[0],
        ),
      ).toEqual({ translation_media_file_id: null }),
    );
  });

  it("offers the bilingual views only once the book is aligned", async () => {
    await renderReader({ isPaired: true });
    openPanel();
    await within(panel()).findByRole("radio", { name: /^Translation/ });
    expect(
      within(panel())
        .getAllByRole("radio")
        .map((radio) => (radio as HTMLInputElement).value),
    ).toEqual(["target", "translation"]);
  });

  it("shows the translation alone in the translation view", async () => {
    await renderReader({ isPaired: true });
    await chooseView(/^Translation/);
    expect(
      await screen.findByText("El gato duerme en el alféizar de la ventana."),
    ).toBeDefined();
  });

  it("opens the translation view at the translation of the place being read", async () => {
    const { store } = await renderReader({
      isAligned: true,
      options: {
        storedPreferences: {
          "readingLocation:b1": JSON.stringify({
            chapterIndex: 1,
            paragraphIndex: 0,
            offset: 0,
          }),
        },
      },
    });
    await chooseView(/^Translation/);
    const main = store.getState().app.screen.main;
    expect(main.kind === "media" && main.reader.translationLocation).toEqual({
      chapterIndex: 0,
      paragraphIndex: 4,
      offset: 0,
    });
  });

  it("shows the translation of a sentence under it in the interlinear view", async () => {
    await renderReader({ isAligned: true });
    await chooseView(/^Interlinear/);
    await vi.waitFor(() =>
      expect(
        paragraphHolding(sentence)?.querySelector(`[${translationAttribute}]`)
          ?.textContent,
      ).toBe("El gato duerme en el alféizar de la ventana."),
    );
  });

  it("looks up a clicked word with its sentence alone as context in the interlinear view", async () => {
    const { client } = await renderReader({ isAligned: true });
    await chooseView(/^Interlinear/);
    await vi.waitFor(() =>
      expect(
        paragraphHolding(sentence)?.querySelector(`[${translationAttribute}]`),
      ).not.toBeNull(),
    );
    fireEvent.click(within(panel()).getByRole("button", { name: "Close" }));
    pointAt("cat");
    click();
    await screen.findByRole("dialog", { name: "Dictionary" });
    expect(lookupQueries(client)[0]).toMatchObject({
      text: "cat is sleeping on the windowsill.",
      context: sentence,
      offset: "4",
    });
  });

  it("shows each paragraph beside its translation in the parallel view", async () => {
    await renderReader({ isAligned: true });
    await chooseView(/^Parallel/);
    expect(
      (
        await screen.findByText("El gato duerme en el alféizar de la ventana.")
      ).closest(`[${translationAttribute}]`)?.previousElementSibling
        ?.textContent,
    ).toBe(sentence);
  });

  it("shows the translation of the chapter title beside the title in the parallel view", async () => {
    await renderReader({ isAligned: true });
    await chooseView(/^Parallel/);
    expect(
      (await screen.findByText("Capítulo uno")).closest(
        `[${translationAttribute}]`,
      )?.previousElementSibling?.textContent,
    ).toBe("Chapter One");
  });

  it("fills a flashcard's context translation from the aligned translation", async () => {
    const { client } = await renderAligned();
    pointAt("cat");
    click(1);
    click(2);
    expect((await findCreatedDraft(client)).content).toMatchObject({
      text_context_translation: "El gato duerme en el alféizar de la ventana.",
    });
  });

  it("tells that a bilingual ebook cannot be made yet when no alignment plugin is installed", async () => {
    await renderReader({ isPaired: true });
    openPanel();
    fireEvent.click(
      await within(panel()).findByRole("button", {
        name: "Combine into a bilingual ebook",
      }),
    );
    expect(
      await screen.findByText(/easyImmerse cannot match them yet/),
    ).toBeDefined();
  });

  it("tells that an installed alignment plugin cannot run yet", async () => {
    await renderReader({ isPaired: true, plugins: [alignmentPlugin] });
    openPanel();
    fireEvent.click(
      await within(panel()).findByRole("button", {
        name: "Combine into a bilingual ebook",
      }),
    );
    expect(
      await screen.findByText(/“Sentence aligner” is installed/),
    ).toBeDefined();
  });
});

describe("ReaderScreen translation of a held word's sentence", () => {
  it("shows it in the dictionary pop-up's sentence row", async () => {
    await renderAligned();
    pointAt("dog");
    holdMouse();
    const popup = await findPopup();
    expect(await within(popup).findByText(dogTranslation)).toBeDefined();
  });

  it("highlights the sentence the translation covers", async () => {
    await renderAligned();
    pointAt("dog");
    holdMouse();
    await within(await findPopup()).findByText(dogTranslation);
    expect(translatedText()).toBe(dogSentence);
  });

  it("makes no flashcard from the held word", async () => {
    const { client } = await renderAligned();
    pointAt("dog");
    holdMouse();
    await within(await findPopup()).findByText(dogTranslation);
    expect(flashcardRequests(client)).toEqual([]);
  });

  it("looks the held word up as a tap would in the interlinear view, where the translation is on screen", async () => {
    await renderReader({ isAligned: true });
    await chooseView(/^Interlinear/);
    fireEvent.click(within(panel()).getByRole("button", { name: "Close" }));
    pointAt("dog");
    holdMouse();
    const popup = await findPopup();
    expect(
      within(popup).queryByRole("button", { name: /translation/ }),
    ).toBeNull();
  });

  it("shows the translation of the pointed word's sentence on T", async () => {
    await renderAligned();
    pointAt("dog");
    pointMouse();
    fireEvent.keyDown(document.body, { key: "t" });
    const popup = await findPopup();
    expect(await within(popup).findByText(dogTranslation)).toBeDefined();
  });

  it("hides the translation on T again", async () => {
    await renderAligned();
    pointAt("dog");
    pointMouse();
    fireEvent.keyDown(document.body, { key: "t" });
    const popup = await findPopup();
    await within(popup).findByText(dogTranslation);
    fireEvent.keyDown(document.body, { key: "t" });
    expect(within(popup).queryByText(dogTranslation)).toBeNull();
  });

  it("shows the translation from the sentence row's button after a tap", async () => {
    await renderAligned();
    pointAt("dog");
    click();
    const popup = await findPopup();
    fireEvent.click(
      await within(popup).findByRole("button", {
        name: "Show the translation (T)",
      }),
    );
    expect(await within(popup).findByText(dogTranslation)).toBeDefined();
  });

  it("keeps the translation shown for the next word looked up", async () => {
    await renderAligned();
    pointAt("dog");
    holdMouse();
    await within(await findPopup()).findByText(dogTranslation);
    pointAt("cat");
    click();
    expect(
      await screen.findByText("El gato duerme en el alféizar de la ventana."),
    ).toBeDefined();
  });
});
