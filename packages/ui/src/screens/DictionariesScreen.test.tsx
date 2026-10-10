import {
  actions,
  createBrowserFileRegistry,
  dictionaryFileExtensions,
  selectNotices,
} from "@easyimmerse/state";
import { act, cleanup, fireEvent, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { exampleDictionaries } from "../dictionaries/exampleDictionaries.ts";
import {
  createFakeBackendClient,
  type FakeResponse,
} from "../testSupport/createFakeBackendClient.ts";
import { renderWithAppStore } from "../testSupport/renderWithAppStore.tsx";
import { DictionariesScreen } from "./DictionariesScreen.tsx";

afterEach(cleanup);

const tablePreview = {
  layout: { columns: ["term", "definition"], hasHeader: false },
  rows: [["Hund", "dog"]],
};

const noProgress = {
  entries: 0,
  term_meta: 0,
  kanji: 0,
  kanji_meta: 0,
  tags: 0,
  media: 0,
};

const doneJob = {
  state: "done",
  progress: { ...noProgress, entries: 412_380 },
  dictionary: exampleDictionaries[0],
  error: null,
};

const runningJob = {
  state: "running",
  progress: { ...noProgress, entries: 123_456 },
  dictionary: null,
  error: null,
};

function renderScreen(responses: Record<string, FakeResponse> = {}) {
  const client = createFakeBackendClient({
    "GET /dictionaries": { dictionaries: exampleDictionaries },
    "DELETE /dictionaries/d1": undefined,
    "POST /dictionaries/import-local": { id: "job1" },
    "POST /dictionaries/preview": tablePreview,
    "POST /dictionaries/preview-local": tablePreview,
    "POST /dictionaries": { id: "job1" },
    "GET /dictionaries/imports/job1": doneJob,
    ...responses,
  });
  const registry = createBrowserFileRegistry<File>();
  const rendered = renderWithAppStore(
    <DictionariesScreen onBack={() => undefined} />,
    client,
    { browserFileRegistry: registry },
  );
  act(() =>
    rendered.store.dispatch(actions.navigated({ type: "openDictionaries" })),
  );
  /** Acts as the user picking a file in the browser. */
  const chooseBrowserFile = (
    name: string,
    file = new File([new Uint8Array([1])], name, { lastModified: 1 }),
  ) => {
    act(() => {
      rendered.store.dispatch(
        actions.dictionaryFileChosen({ name, source: registry.register(file) }),
      );
    });
  };
  const notices = () =>
    selectNotices(rendered.store.getState()).map((notice) => notice.message);
  return { ...rendered, client, chooseBrowserFile, notices };
}

const requestsTo = (
  client: ReturnType<typeof createFakeBackendClient>,
  method: string,
  path: string,
) =>
  client.requests.filter(
    (request) => request.method === method && request.path === path,
  );

describe("DictionariesScreen", () => {
  it("lists the dictionaries the server keeps", async () => {
    renderScreen();
    expect(await screen.findByText("DWDS Kernwortschatz")).toBeDefined();
  });

  it("does not call the list empty while it loads", () => {
    renderScreen();
    expect(screen.queryByText("No dictionaries yet")).toBeNull();
  });

  it("says the list is loading", () => {
    renderScreen();
    expect(screen.getByText("Loading the dictionaries…")).toBeDefined();
  });

  it("asks for a dictionary file when Add from a file is clicked", async () => {
    const { effects } = renderScreen();
    await screen.findByText("DWDS Kernwortschatz");
    fireEvent.click(screen.getByRole("button", { name: "Add from a file" }));
    expect(effects.calls).toContainEqual({
      type: "pickDictionaryFile",
      accept: dictionaryFileExtensions,
    });
  });

  async function confirmRemoval(responses: Record<string, FakeResponse> = {}) {
    const rendered = renderScreen(responses);
    fireEvent.click(
      await screen.findByRole("button", {
        name: "Remove German-English Wiktionary",
      }),
    );
    fireEvent.click(screen.getByRole("button", { name: "Remove" }));
    return rendered;
  }

  it("removes a dictionary once its removal is confirmed", async () => {
    const { client } = await confirmRemoval();
    await vi.waitFor(() =>
      expect(requestsTo(client, "DELETE", "/dictionaries/d1")).toHaveLength(1),
    );
  });

  it("moves focus to the heading once the removed dictionary is gone", async () => {
    await confirmRemoval();
    await vi.waitFor(() =>
      expect(document.activeElement).toBe(
        screen.getByRole("heading", { name: "Dictionaries" }),
      ),
    );
  });

  it("has the server import a file the desktop app picked from its path", async () => {
    const { client, store } = renderScreen();
    act(() => {
      store.dispatch(
        actions.dictionaryFileChosen({
          name: "jmdict.zip",
          source: { kind: "path", path: "/dictionaries/jmdict.zip" },
        }),
      );
    });
    await vi.waitFor(() =>
      expect(
        requestsTo(client, "POST", "/dictionaries/import-local")[0]?.body,
      ).toEqual({ kind: "json", value: { path: "/dictionaries/jmdict.zip" } }),
    );
  });

  it("sends a file the browser picked as bytes", async () => {
    const { client, chooseBrowserFile } = renderScreen();
    chooseBrowserFile("jmdict.zip");
    await vi.waitFor(() =>
      expect(requestsTo(client, "POST", "/dictionaries")[0]?.query).toEqual({
        fileName: "jmdict.zip",
      }),
    );
  });

  it("imports a table with the columns the user checked", async () => {
    const { client, chooseBrowserFile } = renderScreen();
    chooseBrowserFile("animals.csv");
    fireEvent.click(await screen.findByRole("button", { name: "Import" }));
    await vi.waitFor(() =>
      expect(requestsTo(client, "POST", "/dictionaries")[0]?.query).toEqual({
        fileName: "animals.csv",
        columns: "term,definition",
        hasHeader: "false",
      }),
    );
  });

  describe("while the server imports a file", () => {
    it("shows the import's progress bar", async () => {
      const { chooseBrowserFile } = renderScreen({
        "GET /dictionaries/imports/job1": runningJob,
      });
      chooseBrowserFile("jmdict.zip");
      expect(
        await screen.findByRole("progressbar", { name: "Adding jmdict.zip…" }),
      ).toBeDefined();
    });

    it("counts the entries stored so far", async () => {
      const { chooseBrowserFile } = renderScreen({
        "GET /dictionaries/imports/job1": runningJob,
      });
      chooseBrowserFile("jmdict.zip");
      expect(
        await screen.findByText(`${(123_456).toLocaleString()} entries so far`),
      ).toBeDefined();
    });
  });

  describe("once the server has imported a file", () => {
    it("names the added dictionary", async () => {
      const { chooseBrowserFile, notices } = renderScreen();
      chooseBrowserFile("jmdict.zip");
      await vi.waitFor(() =>
        expect(notices()).toEqual(["Added German-English Wiktionary"]),
      );
    });

    it("fetches the list again", async () => {
      const { client, chooseBrowserFile } = renderScreen();
      await screen.findByText("DWDS Kernwortschatz");
      chooseBrowserFile("jmdict.zip");
      await vi.waitFor(() =>
        expect(requestsTo(client, "GET", "/dictionaries")).toHaveLength(2),
      );
    });
  });
});
