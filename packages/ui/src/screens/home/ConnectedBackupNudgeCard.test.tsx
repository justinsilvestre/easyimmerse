import {
  type ServerConfig,
  selectIsSuggestionDismissed,
} from "@easyimmerse/state";
import { act, cleanup, fireEvent, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { createFakeBackendClient } from "../../testSupport/createFakeBackendClient.ts";
import {
  fixtureProject,
  fixtureResponses,
  fixtureSyncLink,
  fixtureSyncStatus,
} from "../../testSupport/fixtureResponses.ts";
import {
  type RenderOptions,
  renderWithAppStore,
} from "../../testSupport/renderWithAppStore.tsx";
import { ConnectedBackupNudgeCard } from "./ConnectedBackupNudgeCard.tsx";

afterEach(cleanup);

const desktopServer: ServerConfig = {
  serverUrl: "http://127.0.0.1:1",
  token: "t",
  bundledIn: "desktop",
};

const cardName = "Saved only on this computer";

/** A built-in server listing one project, with the given number of flashcards, and linked to a remote or to none. */
const desktopClient = ({ flashcards = 3, isLinked = false } = {}) =>
  createFakeBackendClient({
    ...fixtureResponses,
    "GET /projects": {
      projects: [{ ...fixtureProject, flashcard_count: flashcards }],
    },
    "GET /sync/status": fixtureSyncStatus(isLinked ? fixtureSyncLink : null),
  });

/** Renders the card on the desktop app and waits for the server's answers. */
async function renderCard(
  client = desktopClient(),
  options: RenderOptions = {},
) {
  const rendered = renderWithAppStore(<ConnectedBackupNudgeCard />, client, {
    server: desktopServer,
    ...options,
  });
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 0));
  });
  return rendered;
}

describe("ConnectedBackupNudgeCard", () => {
  describe("while a flashcard is saved only on this computer", () => {
    it("shows a card named by where the work is saved", async () => {
      await renderCard();
      expect(screen.getByRole("region", { name: cardName })).toBeDefined();
    });

    it("explains how the work could be lost", async () => {
      await renderCard();
      expect(
        screen.getByText(/If the computer is lost or its disk fails/),
      ).toBeDefined();
    });

    it("offers to let other devices connect", async () => {
      await renderCard();
      expect(
        screen.getByRole("button", { name: "Let other devices connect" }),
      ).toBeDefined();
    });

    it("opens the account settings to log in", async () => {
      const { store } = await renderCard();
      fireEvent.click(
        screen.getByRole("button", { name: "Log in or sign up" }),
      );
      expect(store.getState().app.route).toMatchObject({
        screen: "settings",
        pages: ["account"],
      });
    });
  });

  describe("when Not now is clicked", () => {
    it("hides the card", async () => {
      await renderCard();
      fireEvent.click(screen.getByRole("button", { name: "Not now" }));
      expect(screen.queryByRole("region", { name: cardName })).toBeNull();
    });

    it("stores the card's dismissal", async () => {
      const { store } = await renderCard();
      fireEvent.click(screen.getByRole("button", { name: "Not now" }));
      expect(selectIsSuggestionDismissed("backup")(store.getState())).toBe(
        true,
      );
    });
  });

  it("shows nothing while no project has a flashcard", async () => {
    await renderCard(desktopClient({ flashcards: 0 }));
    expect(screen.queryByRole("region", { name: cardName })).toBeNull();
  });

  it("shows nothing while the work is backed up to a server", async () => {
    await renderCard(desktopClient({ isLinked: true }));
    expect(screen.queryByRole("button", { name: "Not now" })).toBeNull();
  });

  it("shows nothing once the card was dismissed", async () => {
    await renderCard(desktopClient(), {
      storedPreferences: { dismissedSuggestions: '["backup"]' },
    });
    expect(screen.queryByRole("region", { name: cardName })).toBeNull();
  });
});
