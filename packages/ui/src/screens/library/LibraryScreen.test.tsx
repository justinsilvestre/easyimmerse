import type { AccountUser, CurrentPrincipal } from "@easyimmerse/types";
import {
  cleanup,
  fireEvent,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { createFakeBackendClient } from "../../testSupport/createFakeBackendClient.ts";
import { exampleLibraryItems } from "../../testSupport/exampleLibrary.ts";
import { fixtureResponses } from "../../testSupport/fixtureResponses.ts";
import { renderWithAppStore } from "../../testSupport/renderWithAppStore.tsx";
import { LibraryScreen } from "./LibraryScreen.tsx";

afterEach(cleanup);

const learner: AccountUser = {
  id: "u2",
  email: "someone@example.com",
  role: "library_user",
  created_at_ms: 0,
  email_confirmed_at_ms: null,
  manages_library: false,
};

/** Renders the library of a server that lists the example items to the given principal. */
function renderLibrary(principal: CurrentPrincipal) {
  const client = createFakeBackendClient({
    ...fixtureResponses,
    "GET /auth/me": principal,
    "GET /library/items": { items: exampleLibraryItems },
  });
  return renderWithAppStore(<LibraryScreen />, client);
}

const titles = exampleLibraryItems.map(({ title }) => title);

/** The titles of the items listed, in order. */
const itemTitles = async () =>
  within(await screen.findByRole("list", { name: "Library items" }))
    .getAllByRole("listitem")
    .map((item) => titles.find((title) => item.textContent?.startsWith(title)));

describe("LibraryScreen", () => {
  it("lists every item at first", async () => {
    renderLibrary({ kind: "account", user: learner });
    expect(await itemTitles()).toEqual([
      "Im Park",
      "Nachrichten am Morgen",
      "桃太郎",
    ]);
  });

  it("hides the items without a tag once it is turned on", async () => {
    renderLibrary({ kind: "account", user: learner });
    fireEvent.click(await screen.findByRole("button", { name: "news" }));
    expect(await itemTitles()).toEqual(["Nachrichten am Morgen"]);
  });

  it("hides the items in other languages once a language is chosen", async () => {
    renderLibrary({ kind: "account", user: learner });
    fireEvent.change(await screen.findByLabelText("Language"), {
      target: { value: "ja" },
    });
    expect(await itemTitles()).toEqual(["桃太郎"]);
  });

  it("names each item's language while every language is listed", async () => {
    renderLibrary({ kind: "account", user: learner });
    const list = await screen.findByRole("list", { name: "Library items" });
    expect(within(list).getAllByText("German")).toHaveLength(2);
  });

  it("leaves out the items' language once a language is chosen", async () => {
    renderLibrary({ kind: "account", user: learner });
    fireEvent.change(await screen.findByLabelText("Language"), {
      target: { value: "de" },
    });
    await waitFor(async () => expect(await itemTitles()).toHaveLength(2));
    const list = screen.getByRole("list", { name: "Library items" });
    expect(within(list).queryByText("German")).toBeNull();
  });

  describe("for someone who cannot manage the library", () => {
    it("shows no Manage library button", async () => {
      renderLibrary({ kind: "account", user: learner });
      await screen.findByRole("list", { name: "Library items" });
      expect(
        screen.queryByRole("button", { name: "Manage library" }),
      ).toBeNull();
    });
  });

  describe("for a library manager", () => {
    it("shows a Manage library button", async () => {
      renderLibrary({
        kind: "account",
        user: { ...learner, manages_library: true },
      });
      expect(
        await screen.findByRole("button", { name: "Manage library" }),
      ).toBeDefined();
    });
  });
});
