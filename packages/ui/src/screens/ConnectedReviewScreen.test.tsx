import { actions, selectRoute } from "@easyimmerse/state";
import { act, cleanup, fireEvent, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { Screens } from "../Screens.tsx";
import { createFakeBackendClient } from "../testSupport/createFakeBackendClient.ts";
import { fixtureResponses } from "../testSupport/fixtureResponses.ts";
import { renderWithAppStore } from "../testSupport/renderWithAppStore.tsx";
import { fixtureReviewQueue } from "../testSupport/reviewFixtures.ts";

afterEach(cleanup);

/**
 * Opens the review of p1 over the fixture backend, whose queue holds three new cards the first time it is fetched,
 * and none after, as once those cards are rated.
 */
async function renderReview() {
  let fetchCount = 0;
  const client = createFakeBackendClient({
    ...fixtureResponses,
    "GET /projects/p1/review/queue": () =>
      fetchCount++ === 0 ? fixtureReviewQueue : { cards: [] },
  });
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
  vi.waitFor(() => {
    expect(
      screen.getByRole("article", { name: "Flashcard" }).textContent,
    ).toContain(word);
  });

/** Shows the answer of the card shown and rates it Remembered. */
async function remember() {
  fireEvent.click(screen.getByRole("button", { name: /^Show answer/ }));
  fireEvent.click(await screen.findByRole("button", { name: /^Remembered/ }));
}

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
    await vi.waitFor(() => expect(answersSent(client)).toHaveLength(1));
    expect(answersSent(client)[0]?.body?.value).toMatchObject({
      flashcard_id: "r1",
      rating: "good",
    });
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
    await vi.waitFor(() =>
      expect(answersSent(client)[0]?.body?.value).toMatchObject({
        rating: "again",
      }),
    );
  });

  it("shows the card again on Undo", async () => {
    await renderReview();
    await remember();
    await showsWord("Hund");
    const undo = screen.getByRole("button", { name: "Undo" });
    await vi.waitFor(() => expect(undo.hasAttribute("disabled")).toBe(false));
    fireEvent.click(undo);
    await expect(showsWord("Katze")).resolves.toBeUndefined();
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
});
