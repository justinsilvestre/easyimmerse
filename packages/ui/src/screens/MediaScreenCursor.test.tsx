import { cleanup, fireEvent, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  findCreatedDraft,
  findRequestTo,
  findSubtitles,
  renderMediaScreen,
} from "../testSupport/renderMediaScreen.tsx";

afterEach(cleanup);

/** The word in the card of the given cue, counting cards from one. */
async function cardWord(cardNumber: number, word: string) {
  const list = await findSubtitles();
  const card = within(list).getAllByRole("listitem")[cardNumber - 1];
  return within(card as HTMLElement).getByRole("button", { name: word });
}

/** Gives a word keyboard focus, as Tab would, and presses keys on whatever has focus after each. */
function focusAndPress(word: HTMLElement, ...keys: string[]) {
  word.focus();
  for (const key of keys)
    fireEvent.keyDown(document.activeElement ?? document.body, { key });
}

const fieldValue = () =>
  screen.getByRole<HTMLInputElement>("textbox", { name: "Word to look up" })
    .value;

const isHighlighted = (word: HTMLElement) =>
  word.classList.contains("bg-accent-soft");

/** The text a lookup from "dog" in the second cue sends. */
const dogCueFromDog = "dog wants to eat.\nIt is hungry.";

const seeks = (effects: { calls: { type: string }[] }) =>
  effects.calls.filter((call) => call.type === "seekPlayer");

describe("MediaScreen lookup cursor", () => {
  describe("with Right on a focused word of the subtitles panel", () => {
    it("seeks nowhere", async () => {
      const { effects } = renderMediaScreen();
      focusAndPress(await cardWord(1, "The"), "ArrowRight");
      expect(seeks(effects)).toEqual([]);
    });

    it("moves focus to the next word of the same cue", async () => {
      renderMediaScreen();
      focusAndPress(await cardWord(1, "The"), "ArrowRight");
      expect(document.activeElement).toBe(await cardWord(1, "cat"));
    });

    it("looks up the word it moved to with L", async () => {
      renderMediaScreen();
      focusAndPress(await cardWord(1, "The"), "ArrowRight", "l");
      await vi.waitFor(() => expect(fieldValue()).toBe("cat"));
    });

    it("saves a flashcard from the sentence of the word it moved to with C", async () => {
      const { client } = renderMediaScreen();
      focusAndPress(await cardWord(2, "The"), "ArrowRight", "c");
      expect(await findCreatedDraft(client)).toMatchObject({
        content: { text_context: "The dog wants to eat.\nIt is hungry." },
      });
    });

    it("opens a flashcard for the word it moved to with E", async () => {
      renderMediaScreen();
      focusAndPress(await cardWord(2, "The"), "ArrowRight", "e");
      expect(
        ((await screen.findByLabelText("Sentence (de)")) as HTMLTextAreaElement)
          .value,
      ).toBe("The dog wants to eat.\nIt is hungry.");
    });
  });

  it("highlights nothing once the mouse that placed the cursor has left", async () => {
    renderMediaScreen();
    const dog = await cardWord(2, "dog");
    fireEvent.pointerEnter(dog, { pointerType: "mouse" });
    await vi.waitUntil(() => isHighlighted(dog));
    fireEvent.pointerLeave(dog, { pointerType: "mouse" });
    expect(isHighlighted(dog)).toBe(false);
  });

  it("highlights nothing on a word whose lookup has not answered", async () => {
    const { client } = renderMediaScreen({ heldLookups: [dogCueFromDog] });
    const dog = await cardWord(2, "dog");
    fireEvent.pointerEnter(dog, { pointerType: "mouse" });
    await findRequestTo(client, "GET", "/dictionaries/lookup");
    expect(isHighlighted(dog)).toBe(false);
  });

  it("takes the highlight off a word at once when the mouse moves to one whose lookup has not answered", async () => {
    renderMediaScreen({ heldLookups: [dogCueFromDog] });
    const cat = await cardWord(1, "cat");
    fireEvent.pointerEnter(cat, { pointerType: "mouse" });
    await vi.waitUntil(() => isHighlighted(cat));
    fireEvent.pointerLeave(cat, { pointerType: "mouse" });
    fireEvent.pointerEnter(await cardWord(2, "dog"), { pointerType: "mouse" });
    expect(isHighlighted(cat)).toBe(false);
  });

  it("highlights a word whose lookup is cached in the same moment the mouse moves onto it", async () => {
    const { client } = renderMediaScreen({ batchLookups: "held" });
    const dog = await cardWord(2, "dog");
    await findRequestTo(client, "POST", "/dictionaries/lookup/batch");
    await client.releaseBatches();
    fireEvent.pointerEnter(dog, { pointerType: "mouse" });
    expect(isHighlighted(dog)).toBe(true);
  });

  it("leaves the pop-up's word unhighlighted while the mouse is on a word of another cue", async () => {
    renderMediaScreen({ heldLookups: [dogCueFromDog] });
    const cat = await cardWord(1, "cat");
    fireEvent.click(cat, { detail: 1 });
    await screen.findByRole("dialog", { name: "Dictionary" });
    fireEvent.pointerEnter(await cardWord(2, "dog"), { pointerType: "mouse" });
    expect(isHighlighted(cat)).toBe(false);
  });

  it("opens the search field with L once Escape has taken the cursor away", async () => {
    renderMediaScreen();
    focusAndPress(await cardWord(1, "The"), "ArrowRight", "Escape", "l");
    expect(fieldValue()).toBe("");
  });

  describe("with Down on a focused word of the subtitles panel", () => {
    it("seeks to the start of the next cue", async () => {
      const { effects } = renderMediaScreen();
      focusAndPress(await cardWord(1, "cat"), "ArrowDown");
      expect(seeks(effects)).toEqual([{ type: "seekPlayer", seconds: 1.75 }]);
    });

    it("moves focus to the first word of the next card", async () => {
      renderMediaScreen();
      focusAndPress(await cardWord(1, "cat"), "ArrowDown");
      expect(document.activeElement).toBe(await cardWord(2, "The"));
    });
  });
});
