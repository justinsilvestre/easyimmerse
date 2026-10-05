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

function renderScreen(responses: Record<string, FakeResponse> = {}) {
  const client = createFakeBackendClient({
    "GET /dictionaries": { dictionaries: exampleDictionaries },
    "DELETE /dictionaries/d1": undefined,
    "POST /dictionaries/import-local": exampleDictionaries[0],
    "POST /dictionaries/preview": tablePreview,
    "POST /dictionaries": exampleDictionaries[0],
    ...responses,
  });
  const registry = createBrowserFileRegistry<File>();
  const rendered = renderWithAppStore(
    <DictionariesScreen onBack={() => undefined} />,
    client,
    { browserFileRegistry: registry },
  );
  /** Acts as the user picking a file in the browser. */
  const chooseBrowserFile = (name: string) => {
    const file = new File([new Uint8Array([1])], name, { lastModified: 1 });
    act(() => {
      rendered.store.dispatch(
        actions.dictionaryFileChosen({ name, source: registry.register(file) }),
      );
    });
  };
  return { ...rendered, client, chooseBrowserFile };
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

  it("asks for a dictionary file when Add from a file is clicked", async () => {
    const { effects } = renderScreen();
    await screen.findByText("DWDS Kernwortschatz");
    fireEvent.click(screen.getByRole("button", { name: "Add from a file" }));
    expect(effects.calls).toContainEqual({
      type: "pickDictionaryFile",
      accept: dictionaryFileExtensions,
    });
  });

  it("removes a dictionary", async () => {
    const { client } = renderScreen();
    fireEvent.click(
      await screen.findByRole("button", {
        name: "Remove German-English Wiktionary",
      }),
    );
    await vi.waitFor(() =>
      expect(requestsTo(client, "DELETE", "/dictionaries/d1")).toHaveLength(1),
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

  it("names a file in a format no reader supports", async () => {
    const { chooseBrowserFile } = renderScreen({
      "POST /dictionaries": fakeFailure({
        status: 400,
        code: "unsupported_dictionary_format",
        message: "no supported dictionary format recognizes these files",
      }),
    });
    chooseBrowserFile("duden.lsd");
    expect((await screen.findByRole("alert")).textContent).toContain(
      "duden.lsd",
    );
  });
});
