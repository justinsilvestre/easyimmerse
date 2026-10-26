import { actions, selectRoute } from "@easyimmerse/state";
import {
  act,
  cleanup,
  fireEvent,
  screen,
  waitFor,
} from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { Screens } from "../../Screens.tsx";
import { createFakeBackendClient } from "../../testSupport/createFakeBackendClient.ts";
import { fixtureResponses } from "../../testSupport/fixtureResponses.ts";
import { renderWithAppStore } from "../../testSupport/renderWithAppStore.tsx";
import { fixtureReviewQueue } from "../../testSupport/reviewFixtures.ts";

afterEach(cleanup);

/** The flashcards of the review's cards, as the server lists them. */
const listedFlashcards = () =>
  fixtureReviewQueue.cards.map(({ flashcard }) => flashcard);

/**
 * Opens the review of p1 over the fixture backend, whose queue holds three new cards the first time it is fetched,
 * and none after, as once those cards are rated. The project's flashcards are listed as `listed` returns them when asked.
 */
async function renderReview(listed = listedFlashcards) {
  let fetchCount = 0;
  const client = createFakeBackendClient(
    {
      ...fixtureResponses,
      "GET /projects/p1/review/queue": () =>
        fetchCount++ === 0 ? fixtureReviewQueue : { cards: [] },
      "GET /projects/p1/flashcards": () => ({ flashcards: listed() }),
    },
    [
      ["PUT", /^\/projects\/p1\/review\/holds\/\w+$/, null],
      ["DELETE", /^\/projects\/p1\/review\/holds\/\w+$/, null],
    ],
  );
  const rendered = renderWithAppStore(<Screens />, client);
  act(() =>
    rendered.store.dispatch(
      actions.navigated({ type: "openReview", projectId: "p1" }),
    ),
  );
  await showsWord("Katze");
  return { ...rendered, client };
}

/** Waits until the card shown is that of the word. */
const showsWord = (word: string) =>
  waitFor(() => {
    expect(
      screen.getByRole("article", { name: "Flashcard" }).textContent,
    ).toContain(word);
  });

/** Shows the answer of the card shown and rates it Remembered. */
async function remember() {
  fireEvent.click(screen.getByRole("button", { name: /^Show answer/ }));
  fireEvent.click(await screen.findByRole("button", { name: /^Remembered/ }));
}

/** Waits until Undo can be pressed, which it can once the latest step has landed. */
const undoOnceAvailable = () =>
  waitFor(() => {
    const undo = screen.getByRole("button", { name: "Undo" });
    if (undo.hasAttribute("disabled"))
      throw new Error("Undo is not available yet.");
    return undo;
  });

const answersSent = (
  client: Awaited<ReturnType<typeof renderReview>>["client"],
) =>
  client.requests.filter(
    ({ method, path }) =>
      method === "POST" && path === "/projects/p1/review/answers",
  );

describe("ConnectedReviewScreen", () => {
  it("shows the first card of the queue", async () => {
    await renderReview();
    expect(
      screen.getByRole("article", { name: "Flashcard" }).textContent,
    ).toContain("Die Katze schläft.");
  });

  it("sends the rating of a card to the server", async () => {
    const { client } = await renderReview();
    await remember();
    await waitFor(() =>
      expect(answersSent(client)[0]?.body?.value).toMatchObject({
        flashcard_id: "r1",
        rating: "good",
      }),
    );
  });

  it("shows the next card once a card is rated", async () => {
    await renderReview();
    await remember();
    await expect(showsWord("Hund")).resolves.toBeUndefined();
  });

  it("rates the card on the number keys once the answer is shown", async () => {
    const { client } = await renderReview();
    fireEvent.keyDown(document.body, { key: " " });
    fireEvent.keyDown(document.body, { key: "1" });
    await waitFor(() =>
      expect(answersSent(client)[0]?.body?.value).toMatchObject({
        rating: "again",
      }),
    );
  });

  it("shows the card again on Undo", async () => {
    await renderReview();
    await remember();
    await showsWord("Hund");
    fireEvent.click(await undoOnceAvailable());
    await expect(showsWord("Katze")).resolves.toBeUndefined();
  });

  it("buries the card shown from the More menu", async () => {
    const { client } = await renderReview();
    fireEvent.click(screen.getByRole("button", { name: "More" }));
    fireEvent.click(
      await screen.findByRole("menuitem", { name: "Bury until tomorrow" }),
    );
    await waitFor(() =>
      expect(
        client.requests.find(({ method }) => method === "PUT")?.body?.value,
      ).toMatchObject({ kind: "buried" }),
    );
  });

  it("shows a suspended card again on Undo", async () => {
    await renderReview();
    fireEvent.click(screen.getByRole("button", { name: "More" }));
    fireEvent.click(await screen.findByRole("menuitem", { name: "Suspend" }));
    await showsWord("Hund");
    fireEvent.click(await undoOnceAvailable());
    await expect(showsWord("Katze")).resolves.toBeUndefined();
  });

  it("offers no way to edit a card made from the library", async () => {
    await renderReview(() =>
      listedFlashcards().map((flashcard) => ({
        ...flashcard,
        is_from_library: true,
      })),
    );
    fireEvent.click(screen.getByRole("button", { name: "More" }));
    await screen.findByRole("menuitem", { name: "Suspend" });
    expect(
      screen.queryByRole("menuitem", { name: /^(Edit|Open) flashcard$/ }),
    ).toBeNull();
  });

  it("goes back to the project on Escape", async () => {
    const { store } = await renderReview();
    fireEvent.keyDown(document.body, { key: "Escape" });
    expect(selectRoute(store.getState())).toEqual({
      screen: "project",
      projectId: "p1",
    });
  });

  it("says the day is done once every card is rated", async () => {
    await renderReview();
    for (const word of ["Katze", "Hund", "ruhig"]) {
      await showsWord(word);
      await remember();
    }
    expect(await screen.findByText("Done for today")).toBeTruthy();
  });
  it("shows a card's new content once its flashcard is edited elsewhere", async () => {
    let word = "Katze";
    const listed = () =>
      listedFlashcards().map((flashcard) =>
        flashcard.id === "r1"
          ? { ...flashcard, content: { ...flashcard.content, word } }
          : flashcard,
      );
    await renderReview(listed);
    word = "Kater";
    // Suspending the card fetches the flashcards again, and Undo shows the card once more.
    fireEvent.click(screen.getByRole("button", { name: "More" }));
    fireEvent.click(await screen.findByRole("menuitem", { name: "Suspend" }));
    fireEvent.click(await undoOnceAvailable());
    await expect(showsWord("Kater")).resolves.toBeUndefined();
  });
});
