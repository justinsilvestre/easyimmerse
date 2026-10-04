import type { BackendClient } from "@easyimmerse/backend";
import { resetBackend } from "@easyimmerse/backend";
import type { PickedDictionaryFile } from "@easyimmerse/state";
import { cleanup, fireEvent, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  createFakeBackendClient,
  fakeFailure,
} from "../testSupport/createFakeBackendClient.ts";
import {
  fixtureDictionaries,
  fixtureProjects,
  fixtureResponses,
} from "../testSupport/fixtureResponses.ts";
import { renderWithAppStore } from "../testSupport/renderWithAppStore.tsx";
import { DictionariesScreen } from "./DictionariesScreen.tsx";

const [germanEnglish] = fixtureDictionaries.dictionaries;

const bytesFile: PickedDictionaryFile = {
  name: "jmdict.zip",
  source: { kind: "bytes", bytes: new Uint8Array([80, 75]) },
};

const pathFile: PickedDictionaryFile = {
  name: "jmdict.zip",
  source: { kind: "path", path: "/dictionaries/jmdict.zip" },
};

afterEach(() => {
  cleanup();
  resetBackend();
});

const createClient = (responses: Record<string, unknown> = {}) =>
  createFakeBackendClient({
    ...fixtureResponses,
    "PUT /dictionaries/d1": { ...germanEnglish, is_enabled: false },
    "POST /dictionaries/d1/move": fixtureDictionaries,
    "DELETE /dictionaries/d1": undefined,
    "POST /dictionaries": germanEnglish,
    "POST /dictionaries/import-local": germanEnglish,
    ...responses,
  });

function renderScreen(
  client: BackendClient = createClient(),
  onBack: () => void = () => undefined,
) {
  return renderWithAppStore(<DictionariesScreen onBack={onBack} />, client);
}

async function openFileDialog() {
  fireEvent.click(
    await screen.findByRole("button", { name: "Add from a file" }),
  );
}

async function pickFile(
  file: PickedDictionaryFile,
  client: BackendClient = createClient(),
) {
  const rendered = renderScreen(client);
  await openFileDialog();
  fireEvent.click(await screen.findByRole("button", { name: "Choose file" }));
  rendered.effects.resolvePickDictionaryFile(file);
  return rendered;
}

describe("DictionariesScreen", () => {
  it("lists the dictionaries", async () => {
    renderScreen();
    expect(
      await screen.findByRole("checkbox", { name: "Enable JMdict" }),
    ).toBeDefined();
  });

  it("reports when the dictionaries cannot be loaded", async () => {
    renderScreen(createFakeBackendClient({}));
    expect((await screen.findByRole("alert")).textContent).toBe(
      "Could not load the dictionaries.",
    );
  });

  it("calls onBack when Back is clicked", async () => {
    const onBack = vi.fn();
    renderScreen(createClient(), onBack);
    await screen.findByRole("heading", { name: "Dictionaries" });
    fireEvent.click(screen.getByRole("button", { name: "Back" }));
    expect(onBack).toHaveBeenCalledOnce();
  });

  it("disables an enabled dictionary when toggled", async () => {
    const client = createClient();
    renderScreen(client);
    fireEvent.click(
      await screen.findByRole("checkbox", { name: "Enable German-English" }),
    );
    await vi.waitFor(() => {
      expect(client.requests).toContainEqual({
        method: "PUT",
        path: "/dictionaries/d1",
        body: { kind: "json", value: { is_enabled: false } },
      });
    });
  });

  it("moves a dictionary", async () => {
    const client = createClient();
    renderScreen(client);
    fireEvent.click(
      await screen.findByRole("button", { name: "Move German-English down" }),
    );
    await vi.waitFor(() => {
      expect(client.requests).toContainEqual({
        method: "POST",
        path: "/dictionaries/d1/move",
        body: { kind: "json", value: { direction: "down" } },
      });
    });
  });

  it("removes a dictionary", async () => {
    const client = createClient();
    renderScreen(client);
    fireEvent.click(
      await screen.findByRole("button", { name: "Remove German-English" }),
    );
    await vi.waitFor(() => {
      expect(client.requests).toContainEqual({
        method: "DELETE",
        path: "/dictionaries/d1",
      });
    });
  });

  it("shows a notification when a change fails", async () => {
    const { effects } = renderScreen(
      createClient({
        "DELETE /dictionaries/d1": fakeFailure({ status: 500, message: "" }),
      }),
    );
    fireEvent.click(
      await screen.findByRole("button", { name: "Remove German-English" }),
    );
    await vi.waitFor(() => {
      expect(effects.calls).toContainEqual({
        type: "showNotification",
        message: "The dictionary could not be changed",
      });
    });
  });

  it("says that the registry has no dictionaries yet", async () => {
    renderScreen();
    fireEvent.click(
      await screen.findByRole("button", { name: "Add from the registry" }),
    );
    expect(
      screen.getByText("The registry has no dictionaries yet."),
    ).toBeDefined();
  });

  describe("when adding from a file", () => {
    it("starts from the most recently opened project's target language", async () => {
      const [alpha, beta] = fixtureProjects.projects;
      renderScreen(
        createClient({ "GET /projects": { projects: [beta, alpha] } }),
      );
      await openFileDialog();
      expect(
        (
          (await screen.findByLabelText(
            "Language of the words",
          )) as HTMLSelectElement
        ).value,
      ).toBe("ja");
    });

    it("asks the platform for a dictionary file", async () => {
      const { effects } = renderScreen();
      await openFileDialog();
      fireEvent.click(
        await screen.findByRole("button", { name: "Choose file" }),
      );
      expect(effects.calls).toContainEqual({ type: "pickDictionaryFile" });
    });

    it("sends a file's bytes with the chosen languages", async () => {
      const client = createClient();
      await pickFile(bytesFile, client);
      await vi.waitFor(() => {
        expect(client.requests).toContainEqual(
          expect.objectContaining({
            method: "POST",
            path: "/dictionaries",
            query: { source_language: "de", target_language: "en" },
          }),
        );
      });
    });

    it("sends a file's path with the chosen languages", async () => {
      const client = createClient();
      await pickFile(pathFile, client);
      await vi.waitFor(() => {
        expect(client.requests).toContainEqual({
          method: "POST",
          path: "/dictionaries/import-local",
          body: {
            kind: "json",
            value: {
              path: "/dictionaries/jmdict.zip",
              source_language: "de",
              target_language: "en",
            },
          },
        });
      });
    });

    it("names a file in an unsupported format", async () => {
      await pickFile(
        bytesFile,
        createClient({
          "POST /dictionaries": fakeFailure({
            status: 400,
            code: "unsupported_format",
            message: "Unrecognized archive.",
          }),
        }),
      );
      expect((await screen.findByRole("alert")).textContent).toContain(
        "jmdict.zip is not in a format the app can read.",
      );
    });

    it("shows a notification when the import fails otherwise", async () => {
      const { effects } = await pickFile(
        bytesFile,
        createClient({
          "POST /dictionaries": fakeFailure({ status: 500, message: "" }),
        }),
      );
      await vi.waitFor(() => {
        expect(effects.calls).toContainEqual({
          type: "showNotification",
          message: "The dictionary could not be added",
        });
      });
    });
  });
});
