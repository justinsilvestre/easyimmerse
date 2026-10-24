import { selectRoute } from "@easyimmerse/state";
import { cleanup, fireEvent, screen, waitFor } from "@testing-library/react";
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
  const rendered = renderWithAppStore(
    <LibraryEditScreen itemId="i1" />,
    client,
  );
  return { client, store: rendered.store };
}

/** Presses "Open in the player" once the projects are known. */
async function openInPlayer() {
  const button = await screen.findByRole("button", {
    name: "Open in the player",
  });
  await waitFor(() => expect(button.getAttribute("aria-disabled")).toBeNull());
  fireEvent.click(button);
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
});
