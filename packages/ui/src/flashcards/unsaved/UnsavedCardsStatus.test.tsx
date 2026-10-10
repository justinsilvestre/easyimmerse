import { actions } from "@easyimmerse/state";
import { act, cleanup, fireEvent, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import {
  createFakeBackendClient,
  fakeFailure,
} from "../../testSupport/createFakeBackendClient.ts";
import { fixtureResponses } from "../../testSupport/fixtureResponses.ts";
import { requestsTo } from "../../testSupport/renderMediaScreen.tsx";
import { renderWithAppStore } from "../../testSupport/renderWithAppStore.tsx";
import { exampleFlashcard } from "../exampleFlashcard.ts";

afterEach(cleanup);

/** Renders the app's notice region over a screen of m1, and saves a flashcard for each word there, which the backend refuses with a server error. */
async function renderFailedSaves(...words: string[]) {
  const client = createFakeBackendClient({
    ...fixtureResponses,
    "POST /projects/p1/flashcards": fakeFailure({
      status: 500,
      message: "The server is unavailable.",
    }),
  });
  const { store } = renderWithAppStore(<p>Screen</p>, client);
  act(() => {
    store.dispatch(actions.openMediaFileRequested("p1", "m1"));
    for (const word of words) store.dispatch(startedSave(word));
  });
  await screen.findByText(countText(words.length));
  return client;
}

const startedSave = (word: string) =>
  actions.flashcardStarted(
    {
      id: `id-${word}`,
      draft: {
        media_file_id: "m1",
        cue_index: 1,
        word_start: null,
        content: { ...exampleFlashcard, word },
        included_fields: ["word"],
      },
    },
    "save",
  );

const countText = (count: number) =>
  count === 1 ? "1 flashcard not saved" : `${count} flashcards not saved`;

const saves = (client: Awaited<ReturnType<typeof renderFailedSaves>>) =>
  requestsTo(client.requests, "POST", "/projects/p1/flashcards").length;

const expand = () =>
  fireEvent.click(screen.getByRole("button", { name: "Show" }));

describe("UnsavedCardsStatus", () => {
  it("counts the flashcards not saved", async () => {
    await renderFailedSaves("fressen", "schlafen");
    expect(screen.getByText("2 flashcards not saved")).toBeTruthy();
  });

  it("lists the flashcards once expanded", async () => {
    await renderFailedSaves("fressen", "schlafen");
    expand();
    expect(
      screen
        .getAllByRole("listitem")
        .map((item) => item.textContent?.split("Retry")[0]),
    ).toEqual(["fressen", "schlafen"]);
  });

  it("collapses the list with ×", async () => {
    await renderFailedSaves("fressen");
    expand();
    fireEvent.click(screen.getByRole("button", { name: "Hide the list" }));
    expect(
      screen.queryByRole("list", { name: "Flashcards not saved" }),
    ).toBeNull();
  });

  it("sends a flashcard again on its Retry", async () => {
    const client = await renderFailedSaves("fressen");
    expand();
    fireEvent.click(screen.getByRole("button", { name: "Retry “fressen”" }));
    expect(saves(client)).toBe(2);
  });

  it("sends every flashcard again on Retry all", async () => {
    const client = await renderFailedSaves("fressen", "schlafen");
    fireEvent.click(screen.getByRole("button", { name: "Retry all" }));
    expect(saves(client)).toBe(4);
  });

  it("offers Undo once a flashcard is discarded", async () => {
    await renderFailedSaves("fressen");
    expand();
    fireEvent.click(screen.getByRole("button", { name: "Discard “fressen”" }));
    expect(
      screen.getByText(
        "Discarded your changes to the flashcard for “fressen”.",
      ),
    ).toBeTruthy();
  });
});
