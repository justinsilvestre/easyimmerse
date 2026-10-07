import { resetBackend } from "@easyimmerse/backend";
import {
  actions,
  createBrowserFileRegistry,
  dictionaryFileExtensions,
} from "@easyimmerse/state";
import { act, cleanup, fireEvent, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { exampleDictionaries } from "../dictionaries/exampleDictionaries.ts";
import {
  createFakeBackendClient,
  type FakeResponse,
  fakeFailure,
} from "../testSupport/createFakeBackendClient.ts";
import { renderWithAppStore } from "../testSupport/renderWithAppStore.tsx";
import { DictionariesScreen } from "./DictionariesScreen.tsx";

afterEach(() => {
  cleanup();
  resetBackend();
});

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

const failedJob = (error: { code: string; message: string }) => ({
  state: "failed",
  progress: noProgress,
  dictionary: null,
  error,
});

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
  const notifications = () =>
    rendered.effects.calls.flatMap((call) =>
      call.type === "showNotification" ? [call.message] : [],
    );
  return { ...rendered, client, chooseBrowserFile, notifications };
}

const serverFailure = fakeFailure({
  status: 400,
  code: "bad_request",
  message: "the index is broken",
});

/** A file whose bytes cannot be read, as when it was deleted after being picked. */
class UnreadableFile extends File {
  override arrayBuffer(): Promise<ArrayBuffer> {
    return Promise.reject(new Error("The file could not be read."));
  }
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

  describe("when Remove is clicked", () => {
    async function pressRemove() {
      const rendered = renderScreen();
      fireEvent.click(
        await screen.findByRole("button", {
          name: "Remove German-English Wiktionary",
        }),
      );
      return rendered;
    }

    it("asks for confirmation, naming the dictionary", async () => {
      await pressRemove();
      expect(
        screen.getByRole("dialog", {
          name: "Remove German-English Wiktionary?",
        }),
      ).toBeDefined();
    });

    it("says that the removal cannot be undone", async () => {
      await pressRemove();
      expect(screen.getByRole("dialog").textContent).toContain(
        "cannot be undone",
      );
    });

    it("does not say where the dictionary is kept, which differs between the apps", async () => {
      await pressRemove();
      expect(screen.getByRole("dialog").textContent).not.toContain("device");
    });

    it("focuses Cancel", async () => {
      await pressRemove();
      expect(document.activeElement).toBe(
        screen.getByRole("button", { name: "Cancel" }),
      );
    });

    it("removes nothing until confirmed", async () => {
      const { client } = await pressRemove();
      expect(requestsTo(client, "DELETE", "/dictionaries/d1")).toEqual([]);
    });

    it("removes the dictionary once confirmed", async () => {
      const { client } = await pressRemove();
      fireEvent.click(screen.getByRole("button", { name: "Remove" }));
      await vi.waitFor(() =>
        expect(requestsTo(client, "DELETE", "/dictionaries/d1")).toHaveLength(
          1,
        ),
      );
    });

    it("moves focus to the heading once the dictionary is gone", async () => {
      let isRemoved = false;
      renderScreen({
        "GET /dictionaries": () => ({
          dictionaries: exampleDictionaries.filter(
            ({ id }) => !(isRemoved && id === "d1"),
          ),
        }),
        "DELETE /dictionaries/d1": () => {
          isRemoved = true;
        },
      });
      fireEvent.click(
        await screen.findByRole("button", {
          name: "Remove German-English Wiktionary",
        }),
      );
      fireEvent.click(screen.getByRole("button", { name: "Remove" }));
      await vi.waitFor(() =>
        expect(document.activeElement).toBe(
          screen.getByRole("heading", { name: "Dictionaries" }),
        ),
      );
    });

    it("closes the question on Cancel", async () => {
      await pressRemove();
      fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
      expect(screen.queryByRole("dialog")).toBeNull();
    });

    it("removes nothing when cancelled", async () => {
      const { client } = await pressRemove();
      fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
      expect(requestsTo(client, "DELETE", "/dictionaries/d1")).toEqual([]);
    });
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

  describe("for a table the desktop app picked from its path", () => {
    function chooseLocalTable(store: ReturnType<typeof renderScreen>["store"]) {
      act(() => {
        store.dispatch(
          actions.dictionaryFileChosen({
            name: "animals.csv",
            source: { kind: "path", path: "/dictionaries/animals.csv" },
          }),
        );
      });
    }

    it("shows the table's columns before importing it", async () => {
      const { store } = renderScreen();
      chooseLocalTable(store);
      expect(
        await screen.findByRole("dialog", { name: "Import animals.csv" }),
      ).toBeDefined();
    });

    it("has the server import the path with the columns the user checked", async () => {
      const { client, store } = renderScreen();
      chooseLocalTable(store);
      fireEvent.click(await screen.findByRole("button", { name: "Import" }));
      await vi.waitFor(() =>
        expect(
          requestsTo(client, "POST", "/dictionaries/import-local")[0]?.body,
        ).toEqual({
          kind: "json",
          value: {
            path: "/dictionaries/animals.csv",
            tableLayout: { columns: ["term", "definition"], hasHeader: false },
          },
        }),
      );
    });
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

  it("shows a table's columns before importing it", async () => {
    const { chooseBrowserFile } = renderScreen();
    chooseBrowserFile("animals.csv");
    expect(
      await screen.findByRole("dialog", { name: "Import animals.csv" }),
    ).toBeDefined();
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
      const { chooseBrowserFile, notifications } = renderScreen();
      chooseBrowserFile("jmdict.zip");
      await vi.waitFor(() =>
        expect(notifications()).toEqual(["Added German-English Wiktionary"]),
      );
    });

    it("stops showing the file as being added", async () => {
      const { chooseBrowserFile } = renderScreen();
      chooseBrowserFile("jmdict.zip");
      await screen.findByText("Adding jmdict.zip…");
      await vi.waitFor(() =>
        expect(screen.queryByText("Adding jmdict.zip…")).toBeNull(),
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

  describe("when adding a file fails", () => {
    it("says so when the browser no longer holds the file", async () => {
      const { store } = renderScreen();
      act(() => {
        store.dispatch(
          actions.dictionaryFileChosen({
            name: "jmdict.zip",
            source: { kind: "browser_file", size: 1, last_modified_ms: 1 },
          }),
        );
      });
      expect((await screen.findByRole("alert")).textContent).toBe(
        "jmdict.zip is no longer available. Pick it again.",
      );
    });

    it("says what the server reported when the import could not start", async () => {
      const { chooseBrowserFile } = renderScreen({
        "POST /dictionaries": serverFailure,
      });
      chooseBrowserFile("jmdict.zip");
      expect((await screen.findByRole("alert")).textContent).toBe(
        "jmdict.zip could not be added: the index is broken",
      );
    });

    it("says what the server reported when the import failed", async () => {
      const { chooseBrowserFile } = renderScreen({
        "GET /dictionaries/imports/job1": failedJob({
          code: "bad_request",
          message: "term_bank_3.json is not valid JSON",
        }),
      });
      chooseBrowserFile("jmdict.zip");
      expect((await screen.findByRole("alert")).textContent).toBe(
        "jmdict.zip could not be added: term_bank_3.json is not valid JSON",
      );
    });

    it("keeps the alert until it is dismissed", async () => {
      const { chooseBrowserFile } = renderScreen({
        "POST /dictionaries": serverFailure,
      });
      chooseBrowserFile("jmdict.zip");
      fireEvent.click(await screen.findByRole("button", { name: "Dismiss" }));
      expect(screen.queryByRole("alert")).toBeNull();
    });

    it("says so when the job can no longer be found", async () => {
      const { chooseBrowserFile } = renderScreen({
        "GET /dictionaries/imports/job1": fakeFailure({
          status: 404,
          code: "not_found",
          message: 'no import job has the id "job1"',
        }),
      });
      chooseBrowserFile("jmdict.zip");
      expect((await screen.findByRole("alert")).textContent).toContain(
        "no import job has the id",
      );
    });

    it("says so when a table cannot be previewed", async () => {
      const { chooseBrowserFile } = renderScreen({
        "POST /dictionaries/preview": serverFailure,
      });
      chooseBrowserFile("animals.csv");
      expect((await screen.findByRole("alert")).textContent).toBe(
        "animals.csv could not be added: the index is broken",
      );
    });

    it("stops showing the file as being added when it cannot be read", async () => {
      const { chooseBrowserFile } = renderScreen();
      chooseBrowserFile(
        "jmdict.zip",
        new UnreadableFile([], "jmdict.zip", { lastModified: 1 }),
      );
      await screen.findByText("Adding jmdict.zip…");
      await vi.waitFor(() =>
        expect(screen.queryByText("Adding jmdict.zip…")).toBeNull(),
      );
    });
  });

  it("names a file in a format no reader supports", async () => {
    const { chooseBrowserFile } = renderScreen({
      "GET /dictionaries/imports/job1": failedJob({
        code: "unsupported_dictionary_format",
        message: "no supported dictionary format recognizes these files",
      }),
    });
    chooseBrowserFile("duden.lsd");
    expect((await screen.findByRole("alert")).textContent).toContain(
      "is not in a format the app can read",
    );
  });
});
