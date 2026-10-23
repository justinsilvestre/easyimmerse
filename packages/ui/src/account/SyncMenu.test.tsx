import type { BackendClient } from "@easyimmerse/backend";
import { actions, type ServerConfig } from "@easyimmerse/state";
import type { FlashcardDraft, SyncLinkState } from "@easyimmerse/types";
import { act, cleanup, fireEvent, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { AppFooter } from "../components/AppFooter.tsx";
import { exampleFlashcard } from "../flashcards/exampleFlashcard.ts";
import {
  createFakeBackendClient,
  fakeFailure,
} from "../testSupport/createFakeBackendClient.ts";
import {
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

/** A desktop app's server reached over the local network with its launch token, with or without accounts. */
const pairedDesktop = (accounts: boolean) =>
  createFakeBackendClient({
    ...fixtureResponses,
    "GET /auth/me": { kind: "launch" },
    "GET /auth/server": {
      accounts,
      open_signup: false,
      sends_email: false,
    },
  });

/** A built-in server whose projects are not backed up, because its link to the remote is in the given state. */
const linkedIn = (state: SyncLinkState) =>
  createFakeBackendClient({
    ...fixtureResponses,
    "GET /sync/status": fixtureSyncStatus({ ...fixtureSyncLink, state }),
  });

const draft = {
  media_file_id: "m1",
  cue_index: 1,
  word_start: null,
  content: { ...exampleFlashcard, word: "fressen" },
  included_fields: ["word"],
} satisfies FlashcardDraft;

function renderFooter(client?: BackendClient, options: RenderOptions = {}) {
  return renderWithAppStore(<AppFooter />, client, options);
}

/** Renders the footer connected to an account's server, then saves a new flashcard, which the server fails to save. */
async function renderWithFailedSave() {
  const rendered = renderFooter(failingSaves, { server: accountServer });
  await act(async () => {
    rendered.store.dispatch(actions.openMediaFileRequested("p1", "m1"));
    rendered.store.dispatch(
      actions.flashcardStarted({ id: "f1", draft }, "save"),
    );
  });
  return rendered;
}

const renderDesktop = (client = createFakeBackendClient(fixtureResponses)) =>
  renderFooter(client, { server: desktopServer });

async function openMenu(name: string | RegExp) {
  fireEvent.click(await screen.findByRole("button", { name }));
}

describe("SyncMenu", () => {
  describe("while the app runs without a server", () => {
    it("tells that the work is saved only in this browser", () => {
      renderFooter();
      expect(
        screen.getByRole("button", { name: "Saved only in this browser" }),
      ).toBeDefined();
    });

    it("opens a dialog named by the status", async () => {
      renderFooter();
      await openMenu("Saved only in this browser");
      expect(
        screen.getByRole("dialog", { name: "Saved only in this browser" }),
      ).toBeDefined();
    });

    it("opens the account settings screen to log in", async () => {
      const { store } = renderFooter();
      await openMenu("Saved only in this browser");
      fireEvent.click(
        screen.getByRole("button", { name: "Log in or sign up" }),
      );
      expect(store.getState().app.route).toMatchObject({
        screen: "settings",
        pages: ["account"],
      });
    });

    it("opens the local network sync page to pair", async () => {
      const { store } = renderFooter();
      await openMenu("Saved only in this browser");
      fireEvent.click(
        screen.getByRole("button", { name: "Pair with your desktop app" }),
      );
      expect(store.getState().app.route).toMatchObject({
        screen: "settings",
        pages: ["pairing"],
      });
    });
  });

  describe("while the app is logged in to a server", () => {
    it("tells that the work is backed up there", () => {
      renderFooter(undefined, { server: accountServer });
      expect(
        screen.getByRole("button", { name: "Backed up to 127.0.0.1:1" }),
      ).toBeDefined();
    });

    it("offers nothing more to do", async () => {
      renderFooter(undefined, { server: accountServer });
      await openMenu("Backed up to 127.0.0.1:1");
      expect(
        screen.getByRole("dialog").querySelectorAll("button"),
      ).toHaveLength(0);
    });

    it("names the button by the failed saves once a save fails", async () => {
      await renderWithFailedSave();
      expect(
        await screen.findByRole("button", {
          name: "Some flashcards haven't been saved yet",
        }),
      ).toBeDefined();
    });

    it("draws the icon in the warning colour once a save fails", async () => {
      await renderWithFailedSave();
      const button = await screen.findByRole("button", {
        name: "Some flashcards haven't been saved yet",
      });
      expect(button.querySelector("svg")?.classList).toContain(
        "text-warning-fg",
      );
    });
  });

  describe("while the app is paired with a desktop app", () => {
    it("tells of the pairing", async () => {
      renderFooter(pairedDesktop(false), { server: accountServer });
      expect(
        await screen.findByRole("button", {
          name: "Paired with the desktop app at 127.0.0.1:1",
        }),
      ).toBeDefined();
    });

    it("offers to log in while the desktop app's server has accounts", async () => {
      renderFooter(pairedDesktop(true), { server: accountServer });
      await openMenu(/^Paired with/);
      expect(
        await screen.findByRole("button", { name: "Log in" }),
      ).toBeDefined();
    });
  });

  describe("while the desktop app keeps the work on its built-in server", () => {
    it("tells that the work is saved only on this computer", async () => {
      renderDesktop();
      expect(
        await screen.findByRole("button", {
          name: "Saved only on this computer",
        }),
      ).toBeDefined();
    });

    it("explains how the work could be lost", async () => {
      renderDesktop();
      await openMenu("Saved only on this computer");
      expect(
        await screen.findByText(
          "Your work is currently being stored only on this computer. If the computer is lost or its disk fails, you may lose all your work. Log in to an easyImmerse server to back it up there.",
        ),
      ).toBeDefined();
    });

    it("offers to let other devices connect", async () => {
      renderDesktop();
      await openMenu("Saved only on this computer");
      expect(
        screen.getByRole("button", { name: "Let other devices connect" }),
      ).toBeDefined();
    });

    it("tells that the work is backed up to the linked remote", async () => {
      renderDesktop(linkedIn({ kind: "idle" }));
      expect(
        await screen.findByRole("button", {
          name: /^Backed up to cloud\.example\.org/,
        }),
      ).toBeDefined();
    });

    it("explains why the work couldn't be backed up to the remote", async () => {
      renderDesktop(
        linkedIn({ kind: "failed", code: "storage", message: "Disk full." }),
      );
      await openMenu("Couldn't back up to cloud.example.org");
      expect(
        screen.getByText(
          "Your latest work hasn't been backed up to cloud.example.org. easyImmerse couldn't read its own data on this computer.",
        ),
      ).toBeDefined();
    });

    it("fills in the remote and the account to log in again", async () => {
      const { store } = renderDesktop(linkedIn({ kind: "logged_out" }));
      await openMenu("Logged out of cloud.example.org");
      fireEvent.click(screen.getByRole("button", { name: "Log in again" }));
      expect(store.getState().app.account.signInForm).toMatchObject({
        ownServerUrl: "https://cloud.example.org",
        email: "someone@example.org",
      });
    });

    it("offers no other way to back up while the remote logged the app out", async () => {
      renderDesktop(linkedIn({ kind: "logged_out" }));
      await openMenu("Logged out of cloud.example.org");
      expect(
        screen.queryByRole("button", { name: "Log in or sign up" }),
      ).toBeNull();
    });
  });
});
