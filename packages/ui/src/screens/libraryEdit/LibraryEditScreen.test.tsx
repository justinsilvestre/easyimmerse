import { createBrowserFileRegistry, selectRoute } from "@easyimmerse/state";
import {
  act,
  cleanup,
  fireEvent,
  screen,
  waitFor,
} from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import {
  createFakeBackendClient,
  type FakeResponse,
  fakeFailure,
} from "../../testSupport/createFakeBackendClient.ts";
import {
  exampleLibraryItem,
  exampleLibraryVideoText,
} from "../../testSupport/exampleLibrary.ts";
import {
  fixtureProject,
  fixtureResponses,
} from "../../testSupport/fixtureResponses.ts";
import { bodyOf, requestsTo } from "../../testSupport/renderMediaScreen.tsx";
import { renderWithAppStore } from "../../testSupport/renderWithAppStore.tsx";
import { LibraryEditScreen } from "./LibraryEditScreen.tsx";

afterEach(cleanup);

const germanLibrary = {
  ...fixtureProject,
  id: "p5",
  settings: { ...fixtureProject.settings, name: "German library" },
};

/** Renders the details page of the draft item i1, with a server that answers as given. */
function renderEditor(responses: Record<string, FakeResponse> = {}) {
  const client = createFakeBackendClient({
    ...fixtureResponses,
    "GET /library/items/i1": exampleLibraryItem({ status: { kind: "draft" } }),
    "GET /library/items/i1/text": exampleLibraryVideoText,
    "POST /library/items/i1/add": { project_id: "p5", media_file_id: "m9" },
    ...responses,
  });
  const registry = createBrowserFileRegistry<File>();
  const rendered = renderWithAppStore(
    <LibraryEditScreen itemId="i1" />,
    client,
    { browserFileRegistry: registry },
  );
  return { client, store: rendered.store, effects: rendered.effects, registry };
}

/** Presses "Open in the player" once the projects are known. */
async function openInPlayer() {
  const button = await screen.findByRole("button", {
    name: "Open in the player",
  });
  await waitFor(() => expect(button.getAttribute("aria-disabled")).toBeNull());
  fireEvent.click(button);
}

/** Presses "Replace the file" and picks park.mp4 in the file picker. */
async function replaceWithPark(rendered: ReturnType<typeof renderEditor>) {
  fireEvent.click(
    await screen.findByRole("button", { name: "Replace the file" }),
  );
  const file = new File(["video"], "park.mp4", { type: "video/mp4" });
  const source = rendered.registry.register(file);
  act(() => rendered.effects.resolvePickMediaFile({ name: file.name, source }));
}

const addedProject = (client: ReturnType<typeof renderEditor>["client"]) =>
  bodyOf(requestsTo(client.requests, "POST", "/library/items/i1/add")[0]);

describe("LibraryEditScreen", () => {
  describe("when the item is opened in the player", () => {
    it("adds it to the library project of its language", async () => {
      const { client } = renderEditor({
        "GET /projects": { projects: [fixtureProject, germanLibrary] },
      });
      await openInPlayer();
      await waitFor(() =>
        expect(addedProject(client)).toEqual({ project_id: "p5" }),
      );
    });

    it("has a library project made when there is none", async () => {
      const { client } = renderEditor();
      await openInPlayer();
      await waitFor(() =>
        expect(addedProject(client)).toEqual({ project_id: null }),
      );
    });

    it("opens it there", async () => {
      const { store } = renderEditor();
      await openInPlayer();
      await waitFor(() =>
        expect(selectRoute(store.getState())).toMatchObject({
          screen: "media",
          projectId: "p5",
          mediaFileId: "m9",
        }),
      );
    });

    it("tells when it could not be opened", async () => {
      renderEditor({
        "POST /library/items/i1/add": fakeFailure({ status: 500, message: "" }),
      });
      await openInPlayer();
      expect((await screen.findByRole("alert")).textContent).toBe(
        "“Im Park” couldn't be opened in the player or the reader. Try again in a moment.",
      );
    });
  });
  describe("when the file is replaced", () => {
    it("opens the file picker for the kind of file the item has", async () => {
      const { effects } = renderEditor();
      fireEvent.click(
        await screen.findByRole("button", { name: "Replace the file" }),
      );
      expect(effects.calls).toContainEqual(
        expect.objectContaining({
          type: "pickMediaFile",
          accept: expect.arrayContaining([".mp4", ".mp3"]),
        }),
      );
    });

    it("uploads the picked file to the item", async () => {
      const rendered = renderEditor({
        "PUT /library/items/i1/file": exampleLibraryItem(),
      });
      await replaceWithPark(rendered);
      await waitFor(() =>
        expect(
          requestsTo(rendered.client.requests, "PUT", "/library/items/i1/file"),
        ).toHaveLength(1),
      );
    });

    it("names the item when the upload fails", async () => {
      const rendered = renderEditor({
        "PUT /library/items/i1/file": fakeFailure({ status: 500, message: "" }),
      });
      await replaceWithPark(rendered);
      expect((await screen.findByRole("alert")).textContent).toBe(
        "The file of “Im Park” couldn't be replaced. Try again in a moment.",
      );
    });

    it("shows no native file input", async () => {
      renderEditor();
      await screen.findByRole("button", { name: "Replace the file" });
      expect(screen.queryByLabelText("Video or audio file")).toBeNull();
    });
  });
});
