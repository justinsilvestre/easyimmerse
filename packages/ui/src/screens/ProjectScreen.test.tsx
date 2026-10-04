import type { BackendClient } from "@easyimmerse/backend";
import { resetBackend } from "@easyimmerse/backend";
import { actions, mediaFileExtensions } from "@easyimmerse/state";
import { cleanup, fireEvent, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { NavigationActionsContext } from "../navigationContext.ts";
import {
  createFakeBackendClient,
  fakeFailure,
} from "../testSupport/createFakeBackendClient.ts";
import {
  fixtureFlashcard,
  fixtureResponses,
} from "../testSupport/fixtureResponses.ts";
import { renderWithAppStore } from "../testSupport/renderWithAppStore.tsx";
import { ProjectScreen } from "./ProjectScreen.tsx";

afterEach(() => {
  cleanup();
  resetBackend();
});

const createClient = (responses: Record<string, unknown> = {}) =>
  createFakeBackendClient({
    ...fixtureResponses,
    "DELETE /projects/p1/media/m1": undefined,
    ...responses,
  });

function renderScreen(
  client: BackendClient = createClient(),
  callbacks: { onBack?: () => void; openDictionaries?: () => void } = {},
) {
  return renderWithAppStore(
    <NavigationActionsContext
      value={{
        openSettings: () => undefined,
        openDictionaries: callbacks.openDictionaries ?? (() => undefined),
      }}
    >
      <ProjectScreen
        projectId="p1"
        onBack={callbacks.onBack ?? (() => undefined)}
        onEditSettings={() => undefined}
      />
    </NavigationActionsContext>,
    client,
  );
}

const findDictionaryStatus = async () =>
  within(await screen.findByRole("region", { name: "Dictionaries" }));

describe("ProjectScreen", () => {
  it("shows the project's name", async () => {
    renderScreen();
    expect(
      await screen.findByRole("heading", { level: 1, name: "Alpha" }),
    ).toBeDefined();
  });

  it("tells the server that the project was opened", async () => {
    const client = createClient();
    renderScreen(client);
    await vi.waitFor(() => {
      expect(client.requests).toContainEqual(
        expect.objectContaining({
          method: "POST",
          path: "/projects/p1/opened",
        }),
      );
    });
  });

  it("reports when the project cannot be loaded", async () => {
    renderScreen(createFakeBackendClient({}));
    expect((await screen.findByRole("alert")).textContent).toBe(
      "Could not load the project.",
    );
  });

  it("calls onBack when Projects is clicked", async () => {
    const onBack = vi.fn();
    renderScreen(createClient(), { onBack });
    fireEvent.click(await screen.findByRole("button", { name: "Projects" }));
    expect(onBack).toHaveBeenCalledOnce();
  });

  it("says that changes are saved as they are made", async () => {
    const { effects } = renderScreen();
    fireEvent.click(await screen.findByRole("button", { name: "Saved" }));
    expect(effects.calls).toContainEqual({
      type: "showNotification",
      message: "The project saves every change as you make it",
    });
  });

  describe("while a media file is open", () => {
    it("shows the media screen instead of the project", async () => {
      const { store } = renderScreen();
      store.dispatch(actions.openMedia("m1"));
      await vi.waitFor(() => {
        expect(screen.queryByText("Loading the project…")).toBeNull();
      });
      expect(screen.queryByRole("button", { name: "Saved" })).toBeNull();
    });
  });

  describe("dictionary status", () => {
    it("counts the dictionaries for the target language", async () => {
      renderScreen();
      const status = await findDictionaryStatus();
      expect(status.getByText("2 dictionaries")).toBeDefined();
    });

    it("counts the dictionaries with definitions in the translation language", async () => {
      renderScreen();
      const status = await findDictionaryStatus();
      expect(status.getByText("1 dictionary")).toBeDefined();
    });

    it("opens the dictionaries when Manage is clicked", async () => {
      const openDictionaries = vi.fn();
      renderScreen(createClient(), { openDictionaries });
      const status = await findDictionaryStatus();
      fireEvent.click(status.getByRole("button", { name: "Manage" }));
      expect(openDictionaries).toHaveBeenCalledOnce();
    });
  });

  describe("media", () => {
    it("lists the project's media files", async () => {
      renderScreen();
      const list = await screen.findByRole("list", { name: "Media" });
      const named = ["episode.mkv", "interview.mp3"].map((name) =>
        within(list).getByRole("button", { name }),
      );
      expect(
        within(list)
          .getAllByRole("button")
          .filter((button) => named.includes(button)),
      ).toEqual(named);
    });

    it("counts the flashcards made from each file", async () => {
      renderScreen(
        createClient({
          "GET /projects/p1/flashcards": { flashcards: [fixtureFlashcard] },
        }),
      );
      expect(await screen.findByText("1 card")).toBeDefined();
    });

    it("opens a clicked media file", async () => {
      const { store } = renderScreen();
      fireEvent.click(
        await screen.findByRole("button", { name: "interview.mp3" }),
      );
      expect(store.getState().app.currentMediaFileId).toBe("m2");
    });

    it("requests a media file pick when Add media is clicked", async () => {
      const { effects } = renderScreen();
      fireEvent.click(await screen.findByRole("button", { name: "Add media" }));
      expect(effects.calls).toContainEqual({
        type: "pickMediaFile",
        accept: mediaFileExtensions,
      });
    });

    it("asks the server to remove a media file", async () => {
      const client = createClient();
      renderScreen(client);
      fireEvent.click(
        await screen.findByRole("button", { name: "Actions for episode.mkv" }),
      );
      fireEvent.click(
        screen.getByRole("menuitem", { name: "Remove from project" }),
      );
      await vi.waitFor(() => {
        expect(client.requests).toContainEqual({
          method: "DELETE",
          path: "/projects/p1/media/m1",
        });
      });
    });

    it("shows a notification when a media file cannot be removed", async () => {
      const { effects } = renderScreen(
        createClient({
          "DELETE /projects/p1/media/m1": fakeFailure({
            status: 500,
            message: "Broken.",
          }),
        }),
      );
      fireEvent.click(
        await screen.findByRole("button", { name: "Actions for episode.mkv" }),
      );
      fireEvent.click(
        screen.getByRole("menuitem", { name: "Remove from project" }),
      );
      await vi.waitFor(() => {
        expect(effects.calls).toContainEqual({
          type: "showNotification",
          message: "The media file could not be removed",
        });
      });
    });

    it("reports when the media files cannot be loaded", async () => {
      renderScreen(
        createClient({
          "GET /projects/p1/media": fakeFailure({
            status: 500,
            message: "Broken.",
          }),
        }),
      );
      expect((await screen.findByRole("alert")).textContent).toBe(
        "Could not load the media files.",
      );
    });
  });

  it("says that review is not available yet", async () => {
    const { effects } = renderScreen();
    fireEvent.click(
      await screen.findByRole("button", { name: /Review in easyImmerse/ }),
    );
    expect(effects.calls).toContainEqual({
      type: "showNotification",
      message: "Reviewing in easyImmerse is not available yet",
    });
  });
});
