import type { BackendRequest } from "@easyimmerse/backend";
import { actions, selectFlashcardForm } from "@easyimmerse/state";
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
import { afterEach, describe, expect, it, vi } from "vitest";
import { exampleResults } from "../lookup/exampleLookup.ts";
import {
  exampleShortBook,
  exampleShortBookAlignment,
  exampleShortBookTranslation,
} from "../reader/exampleDocuments.ts";
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
  requestsTo,
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
  fireEvent.click(text, { ...point, detail });
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

  it("shows the translation of the sentence a held word belongs to", async () => {
    await renderReader({ isAligned: true });
    // Waits for the translation, which the pop-up shows.
    openPanel();
    await within(panel()).findByRole("radio", { name: /^Interlinear/ });
    fireEvent.click(within(panel()).getByRole("button", { name: "Close" }));
    pointAt("dog");
    holdMouse();
    expect(
      (await screen.findByRole("dialog", { name: "Translation" })).textContent,
    ).toBe("El perro quiere comer. Tiene hambre.");
  });

  it("closes the translation of a held word on Escape", async () => {
    await renderReader({ isAligned: true });
    openPanel();
    await within(panel()).findByRole("radio", { name: /^Interlinear/ });
    fireEvent.click(within(panel()).getByRole("button", { name: "Close" }));
    pointAt("dog");
    holdMouse();
    await screen.findByRole("dialog", { name: "Translation" });
    fireEvent.keyDown(document.body, { key: "Escape" });
    expect(screen.queryByRole("dialog", { name: "Translation" })).toBeNull();
  });

  it("shows the translation of the looked-up word's sentence on T", async () => {
    await renderReader({ isAligned: true });
    openPanel();
    await within(panel()).findByRole("radio", { name: /^Interlinear/ });
    fireEvent.click(within(panel()).getByRole("button", { name: "Close" }));
    pointAt("dog");
    click();
    await screen.findByRole("dialog", { name: "Dictionary" });
    fireEvent.keyDown(document.body, { key: "t" });
    expect(
      (await screen.findByRole("dialog", { name: "Translation" })).textContent,
    ).toBe("El perro quiere comer. Tiene hambre.");
  });

  it("closes the dictionary pop-up as the translation of its word's sentence opens", async () => {
    await renderReader({ isAligned: true });
    openPanel();
    await within(panel()).findByRole("radio", { name: /^Interlinear/ });
    fireEvent.click(within(panel()).getByRole("button", { name: "Close" }));
    pointAt("dog");
    click();
    await screen.findByRole("dialog", { name: "Dictionary" });
    fireEvent.keyDown(document.body, { key: "t" });
    await screen.findByRole("dialog", { name: "Translation" });
    expect(screen.queryByRole("dialog", { name: "Dictionary" })).toBeNull();
  });

  it("hides the translation of a sentence on T again", async () => {
    await renderReader({ isAligned: true });
    openPanel();
    await within(panel()).findByRole("radio", { name: /^Interlinear/ });
    fireEvent.click(within(panel()).getByRole("button", { name: "Close" }));
    pointAt("dog");
    holdMouse();
    await screen.findByRole("dialog", { name: "Translation" });
    fireEvent.keyDown(document.body, { key: "t" });
    expect(screen.queryByRole("dialog", { name: "Translation" })).toBeNull();
  });

  it("fills a flashcard's context translation from the aligned translation", async () => {
    const { store } = await renderReader({ isAligned: true });
    openPanel();
    await within(panel()).findByRole("radio", { name: /^Interlinear/ });
    fireEvent.click(within(panel()).getByRole("button", { name: "Close" }));
    pointAt("cat");
    click(1);
    click(2);
    await screen.findByRole("form", { name: "Flashcard" });
    const card = selectFlashcardForm(store.getState().app)?.card;
    expect(
      card?.kind === "new" && card.draft.content.text_context_translation,
    ).toBe("El gato duerme en el alféizar de la ventana.");
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
