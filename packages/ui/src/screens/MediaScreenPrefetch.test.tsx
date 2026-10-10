import type { BatchLookupRequest } from "@easyimmerse/types";
import {
  act,
  cleanup,
  fireEvent,
  screen,
  within,
} from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
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

/** Advances the faked timers, letting the screen update in between. */
const advance = (ms: number) => act(() => vi.advanceTimersByTimeAsync(ms));

/** Rests the mouse on an element for longer than it takes to look its word up. */
async function restMouseOn(element: HTMLElement) {
  fireEvent.pointerEnter(element, { pointerType: "mouse" });
  await advance(150);
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

describe("MediaScreen lookup prefetch", () => {
  // Only timeouts are faked, as in the other lookup tests, so that the queries' polling keeps real time.
  let flushDue: ReturnType<typeof setInterval>;

  beforeEach(() => {
    vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });
    flushDue = setInterval(() => vi.advanceTimersByTime(0), 5);
  });

  afterEach(() => {
    cleanup();
    clearInterval(flushDue);
    vi.useRealTimers();
  });

  it("looks up the cues of the next minute in one batch, without their markup", async () => {
    const { client } = renderMediaScreen({ batchLookupMs: 0 });
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
    const { client } = renderMediaScreen({ batchLookupMs: 0 });
    await findSubtitles();
    await vi.waitUntil(() => batches(client).length > 0);
    await advance(10);
    await restMouseOn(panelWord("dog"));
    expect(singleLookups(client)).toEqual([]);
  });

  it("waits for the batch being fetched rather than looking a hovered word up on its own", async () => {
    const { client } = renderMediaScreen({ batchLookupMs: 500 });
    await findSubtitles();
    await vi.waitUntil(() => batches(client).length > 0);
    await restMouseOn(panelWord("dog"));
    await advance(600);
    expect(singleLookups(client)).toEqual([]);
  });

  it("follows the mouse to a prefetched word without showing that it is looking it up", async () => {
    const { client } = renderMediaScreen({ batchLookupMs: 0 });
    await findSubtitles();
    await vi.waitUntil(() => batches(client).length > 0);
    const popup = await lookUpInPanel("cat");
    const sawLoading = watchForText("Looking up dog");
    await restMouseOn(panelWord("dog"));
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
      batchLookupMs: 0,
      dictionaries: [dictionarySummary("jmdict", "ja", "en")],
    });
    await findSubtitles();
    await screen.findByRole("button", { name: "night" });
    await advance(50);
    expect(batches(client)).toEqual([]);
  });
});
