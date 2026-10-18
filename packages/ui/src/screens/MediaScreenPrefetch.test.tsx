import type { BatchLookupRequest } from "@easyimmerse/types";
import { cleanup, fireEvent, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { createFakeBackendClient } from "../testSupport/createFakeBackendClient.ts";
import {
  bodyOf,
  dictionarySummary,
  findSubtitles,
  renderMediaScreen,
  requestsTo,
} from "../testSupport/renderMediaScreen.tsx";

type Client = ReturnType<typeof createFakeBackendClient>;

const batches = (client: Client) =>
  requestsTo(client.requests, "POST", "/dictionaries/lookup/batch").map(
    (request) => bodyOf(request) as BatchLookupRequest,
  );

const singleLookups = (client: Client) =>
  requestsTo(client.requests, "GET", "/dictionaries/lookup");

const panelWord = (word: string) =>
  within(screen.getByRole("list", { name: "Subtitles" })).getByRole("button", {
    name: word,
  });

/** Rests the mouse on a word of the subtitles panel until the word is highlighted, which its hover lookup's answer does. */
async function restMouseOn(word: string) {
  fireEvent.pointerEnter(panelWord(word), { pointerType: "mouse" });
  await vi.waitFor(() =>
    expect(panelWord(word).classList.contains("bg-accent-soft")).toBe(true),
  );
}

/** Opens the pop-up on a word of the subtitles panel and waits for its entries. */
async function lookUpInPanel(word: string) {
  fireEvent.click(panelWord(word), { detail: 1 });
  const popup = await screen.findByRole("dialog", { name: "Dictionary" });
  await within(popup).findByRole("button", { name: "devour" });
  return popup;
}

/** Records whether the page ever shows the text, from now on. */
function watchForText(text: string) {
  const seen = { current: false };
  const observer = new MutationObserver(() => {
    if (document.body.textContent?.includes(text)) seen.current = true;
  });
  observer.observe(document.body, {
    subtree: true,
    childList: true,
    characterData: true,
  });
  return seen;
}

afterEach(cleanup);

describe("MediaScreen lookup prefetch", () => {
  it("looks up the cues of the next minute in one batch, without their markup", async () => {
    const { client } = renderMediaScreen({ batchLookups: "immediate" });
    await findSubtitles();
    await vi.waitUntil(() => batches(client).length > 0);
    expect(batches(client)[0]?.texts).toEqual([
      "The cat is sleeping.",
      "The dog wants to eat.\nIt is hungry.",
      "Everything is quiet.",
      "Good night.",
    ]);
  });

  it("sends no lookup of its own for a word hovered in a prefetched cue", async () => {
    const { client } = renderMediaScreen({ batchLookups: "immediate" });
    await findSubtitles();
    await vi.waitUntil(() => batches(client).length > 0);
    await restMouseOn("dog");
    expect(singleLookups(client)).toEqual([]);
  });

  it("waits for the batch being fetched rather than looking a hovered word up on its own", async () => {
    const { client } = renderMediaScreen({ batchLookups: "held" });
    await findSubtitles();
    await vi.waitUntil(() => batches(client).length > 0);
    fireEvent.pointerEnter(panelWord("dog"), { pointerType: "mouse" });
    await client.releaseBatches();
    await restMouseOn("dog");
    expect(singleLookups(client)).toEqual([]);
  });

  it("follows the mouse to a prefetched word without showing that it is looking it up", async () => {
    const { client } = renderMediaScreen({ batchLookups: "immediate" });
    await findSubtitles();
    await vi.waitUntil(() => batches(client).length > 0);
    const popup = await lookUpInPanel("cat");
    const sawLoading = watchForText("Looking up dog");
    fireEvent.pointerEnter(panelWord("dog"), { pointerType: "mouse" });
    await vi.waitUntil(
      () =>
        within(popup).getByRole<HTMLInputElement>("textbox", {
          name: "Word to look up",
        }).value === "dog",
    );
    expect(sawLoading.current).toBe(false);
  });

  it("looks nothing up ahead when no dictionary covers the project's language", async () => {
    const { client } = renderMediaScreen({
      batchLookups: "immediate",
      dictionaries: [dictionarySummary("jmdict", "ja", "en")],
    });
    await findSubtitles();
    fireEvent.click(panelWord("cat"), { detail: 1 });
    // The pop-up asks for a dictionary once the list of dictionaries is known, which is when the prefetch would start.
    await screen.findByRole("button", { name: "Add a dictionary" });
    expect(batches(client)).toEqual([]);
  });
});
