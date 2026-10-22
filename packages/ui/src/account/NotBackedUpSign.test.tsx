import type { BackendClient } from "@easyimmerse/backend";
import {
  type AppStore,
  actions,
  cacheEntry,
  type ServerConfig,
} from "@easyimmerse/state";
import type { FlashcardDraft, SyncLinkState } from "@easyimmerse/types";
import {
  act,
  cleanup,
  fireEvent,
  screen,
  waitFor,
} from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { AppFooter } from "../components/AppFooter.tsx";
import { exampleFlashcard } from "../flashcards/exampleFlashcard.ts";
import {
  createFakeBackendClient,
  fakeFailure,
} from "../testSupport/createFakeBackendClient.ts";
import {
  fixtureProject,
  fixtureResponses,
  fixtureSyncLink,
  fixtureSyncStatus,
} from "../testSupport/fixtureResponses.ts";
import {
  type RenderOptions,
  renderWithAppStore,
} from "../testSupport/renderWithAppStore.tsx";

afterEach(cleanup);

const accountServer: ServerConfig = {
  serverUrl: "http://127.0.0.1:1",
  token: "t",
};

const desktopServer: ServerConfig = { ...accountServer, bundledIn: "desktop" };

const failingSaves = createFakeBackendClient({
  ...fixtureResponses,
  "POST /projects/p1/flashcards": fakeFailure({
    status: 500,
    message: "The server failed.",
  }),
});

const allBackedUp = createFakeBackendClient({
  ...fixtureResponses,
  "GET /projects": { projects: [{ ...fixtureProject, is_backed_up: true }] },
});

const draft = {
  media_file_id: "m1",
  cue_index: 1,
  word_start: null,
  content: { ...exampleFlashcard, word: "fressen" },
  included_fields: ["word"],
} satisfies FlashcardDraft;

/** Renders the footer and opens a new flashcard with a word typed in, which waits to be saved. */
function renderWithOpenCard(server?: ServerConfig) {
  const rendered = renderWithAppStore(<AppFooter />, undefined, { server });
  act(() => {
    rendered.store.dispatch(actions.openMediaFileRequested("p1", "m1"));
    rendered.store.dispatch(
      actions.flashcardStarted({ id: "f1", draft }, "editor"),
    );
    rendered.store.dispatch(
      actions.flashcardEdited({
        type: "textChanged",
        key: "word",
        value: "fraß",
      }),
    );
  });
  return rendered;
}

/** Renders the footer connected to an account's server, then saves a new flashcard, which the server fails to save. */
async function renderWithFailedSave() {
  const rendered = renderWithAppStore(<AppFooter />, failingSaves, {
    server: accountServer,
  });
  await act(async () => {
    rendered.store.dispatch(actions.openMediaFileRequested("p1", "m1"));
    rendered.store.dispatch(
      actions.flashcardStarted({ id: "f1", draft }, "save"),
    );
  });
  return rendered;
}

/** Renders the footer of a native app on its built-in server, which lists its projects. */
function renderBundled(
  client: BackendClient = createFakeBackendClient(fixtureResponses),
  options: RenderOptions = { server: desktopServer },
) {
  return renderWithAppStore(<AppFooter />, client, options);
}

/** A built-in server whose projects are not backed up, because its link to the easyImmerse cloud is in the given state. */
const linkedIn = (state: SyncLinkState) =>
  createFakeBackendClient({
    ...fixtureResponses,
    "GET /sync/status": fixtureSyncStatus({ ...fixtureSyncLink, state }),
  });

/** Waits until the built-in server has listed its projects and reported its sync status. */
function waitUntilFetched(store: AppStore) {
  return waitFor(() => {
    const { backend } = store.getState();
    const isFetched =
      cacheEntry(backend, "listProjects", undefined)?.status === "fulfilled" &&
      cacheEntry(backend, "getSyncStatus", undefined)?.status === "fulfilled";
    if (!isFetched) throw new Error("Not fetched yet.");
  });
}

const findSign = () => screen.findByRole("button", { name: "Not backed up" });

async function openSign() {
  fireEvent.click(await findSign());
}

describe("NotBackedUpSign", () => {
  describe("while flashcards are kept only in this browser", () => {
    it("shows in the footer", () => {
      renderWithOpenCard();
      expect(
        screen.getByRole("button", { name: "Not backed up" }),
      ).toBeDefined();
    });

    it("explains where the flashcards are kept once pressed", async () => {
      renderWithOpenCard();
      await openSign();
      expect(
        screen.getByText(
          "Your flashcards aren't backed up. They're stored only in this browser, so you'll lose them if its data is cleared.",
        ),
      ).toBeDefined();
    });

    it("opens the account settings from its menu", async () => {
      const { store } = renderWithOpenCard();
      await openSign();
      fireEvent.click(
        screen.getByRole("menuitem", { name: "Log in or sign up" }),
      );
      expect(store.getState().app.route).toMatchObject({
        screen: "settings",
        pages: ["general"],
      });
    });
  });

  describe("while the app is connected to an account's server", () => {
    it("does not show while no save has failed", () => {
      renderWithOpenCard(accountServer);
      expect(
        screen.queryByRole("button", { name: "Not backed up" }),
      ).toBeNull();
    });

    it("shows while a save has failed", async () => {
      await renderWithFailedSave();
      expect(await findSign()).toBeDefined();
    });

    it("explains that failed saves are kept in this browser", async () => {
      await renderWithFailedSave();
      await openSign();
      expect(
        screen.getByText(
          "Some flashcards couldn't be saved to your server yet. They're kept in this browser until they're saved, so you'll lose them if its data is cleared.",
        ),
      ).toBeDefined();
    });

    it("offers no way to log in for failed saves", async () => {
      await renderWithFailedSave();
      await openSign();
      expect(screen.queryByRole("menuitem")).toBeNull();
    });
  });

  describe("while the app runs on its built-in server", () => {
    it("shows while a project is not backed up", async () => {
      renderBundled();
      expect(await findSign()).toBeDefined();
    });

    it("explains that work is kept only on this computer", async () => {
      renderBundled();
      await openSign();
      expect(
        screen.getByText(
          "Your work is kept only on this computer, so you'll lose it if the computer is lost or its disk fails. Log in to your own easyImmerse server to keep a copy there.",
        ),
      ).toBeDefined();
    });

    it("explains that work is kept only on this phone or tablet", async () => {
      renderBundled(undefined, {
        server: { ...desktopServer, bundledIn: "mobile" },
        cloudUrl: "https://cloud.example.org",
      });
      await openSign();
      expect(
        screen.getByText(
          "Your work is kept only on this device, so you'll lose it if the device is lost or the app is deleted. Log in to the easyImmerse cloud or to your own server to keep a copy there.",
        ),
      ).toBeDefined();
    });

    it("opens the account settings from its menu", async () => {
      const { store } = renderBundled();
      await openSign();
      fireEvent.click(
        screen.getByRole("menuitem", { name: "Log in or sign up" }),
      );
      expect(store.getState().app.route).toMatchObject({
        screen: "settings",
        pages: ["general"],
      });
    });

    it("does not show while every project is backed up", async () => {
      const { store } = renderBundled(allBackedUp);
      await waitUntilFetched(store);
      expect(
        screen.queryByRole("button", { name: "Not backed up" }),
      ).toBeNull();
    });

    it("explains that the work couldn't be copied to the remote", async () => {
      renderBundled(
        linkedIn({ kind: "failed", code: "storage", message: "Disk full." }),
      );
      await openSign();
      expect(
        screen.getByText(
          "Your latest work is kept only on this computer, because it couldn't be copied to cloud.example.org. Open the account settings to see why.",
        ),
      ).toBeDefined();
    });

    it("opens the account settings while the remote cannot be reached", async () => {
      const { store } = renderBundled(
        linkedIn({ kind: "unreachable", since_ms: Date.now() }),
      );
      await openSign();
      fireEvent.click(
        screen.getByRole("menuitem", { name: "Open account settings" }),
      );
      expect(store.getState().app.route).toMatchObject({
        screen: "settings",
        pages: ["general"],
      });
    });

    it("explains that the remote logged the app out", async () => {
      renderBundled(linkedIn({ kind: "logged_out" }));
      await openSign();
      expect(
        screen.getByText(
          "You were logged out of cloud.example.org on this computer, so your latest work is kept only here. Log in again to keep a copy there.",
        ),
      ).toBeDefined();
    });

    it("fills in the remote and the account to log in again", async () => {
      const { store } = renderBundled(linkedIn({ kind: "logged_out" }));
      await openSign();
      fireEvent.click(screen.getByRole("menuitem", { name: "Log in again" }));
      expect(store.getState().app.account.signInForm).toMatchObject({
        ownServerUrl: "https://cloud.example.org",
        email: "someone@example.org",
      });
    });

    it("does not show while the link to the remote is working", async () => {
      const { store } = renderBundled(linkedIn({ kind: "idle" }));
      await waitUntilFetched(store);
      expect(
        screen.queryByRole("button", { name: "Not backed up" }),
      ).toBeNull();
    });
  });
});
