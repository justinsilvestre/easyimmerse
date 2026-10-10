// C1 removes these cases: they check how the flashcard hooks fill and save a card whose word's lookup answers late.
import { cleanup, fireEvent, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { saveLookupWaitMs } from "../lookup/lookupTiming.ts";
import { doubleClick } from "../testSupport/doubleClick.ts";
import {
  createdDraftOf,
  findCreatedDraft,
  findSubtitles,
  renderMediaScreen,
  requestsTo,
} from "../testSupport/renderMediaScreen.tsx";

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

type Rendered = ReturnType<typeof renderMediaScreen>;

const catLookup = "cat is sleeping.";

const panelWord = (word: string) =>
  within(screen.getByRole("list", { name: "Subtitles" })).getByRole("button", {
    name: word,
  });

const fieldValue = (label: string) =>
  (screen.getByLabelText(label) as HTMLTextAreaElement).value;

const creations = ({ client }: Rendered) =>
  requestsTo(client.requests, "POST", "/projects/p1/flashcards");

const createdContent = (rendered: Rendered) =>
  createdDraftOf(creations(rendered)[0])?.content;

const type = (label: string, value: string) =>
  fireEvent.change(screen.getByLabelText(label), { target: { value } });

/** Lets the held lookup of "cat" answer, and waits until the editor no longer waits for it. */
async function answerCat({ client }: Rendered) {
  await client.answerLookup(catLookup);
  await vi.waitFor(() =>
    expect(screen.queryAllByPlaceholderText("Looking up…")).toEqual([]),
  );
}

/** Opens a flashcard for "cat" with the E key while its lookup is held, and lets the 1.5-second wait for it run out. */
async function openBeforeAnswer() {
  const rendered = renderMediaScreen({ heldLookups: [catLookup] });
  await findSubtitles();
  fireEvent.pointerEnter(panelWord("cat"), { pointerType: "mouse" });
  fireEvent.keyDown(document.body, { key: "e" });
  rendered.advanceClock(1500);
  await screen.findByRole("form", { name: "Flashcard" });
  return rendered;
}

describe("MediaScreen with a lookup that answers after the flashcard has opened", () => {
  it("fills the flashcard from it", async () => {
    const rendered = await openBeforeAnswer();
    await rendered.client.answerLookup(catLookup);
    await vi.waitFor(() => expect(fieldValue("Word (de)")).toBe("fressen"));
  });

  it("leaves alone a field typed in before the answer", async () => {
    const rendered = await openBeforeAnswer();
    type("Word (de)", "Kater");
    await answerCat(rendered);
    expect(fieldValue("Word (de)")).toBe("Kater");
  });

  it("fills the fields the user has not typed in", async () => {
    const rendered = await openBeforeAnswer();
    type("Definition (en)", "a small pet");
    await rendered.client.answerLookup(catLookup);
    await vi.waitFor(() => expect(fieldValue("Word (de)")).toBe("fressen"));
  });

  it("leaves alone a definition typed in before the answer", async () => {
    const rendered = await openBeforeAnswer();
    type("Definition (en)", "a small pet");
    await answerCat(rendered);
    expect(fieldValue("Definition (en)")).toBe("a small pet");
  });

  it("saves at once once the word has been changed before Save", async () => {
    const rendered = await openBeforeAnswer();
    type("Word (de)", "Kater");
    fireEvent.click(screen.getByRole("button", { name: "Save" }));
    await vi.waitFor(() => expect(creations(rendered)).toHaveLength(1));
  });

  it("fills nothing once the word has been changed before the answer", async () => {
    const rendered = await openBeforeAnswer();
    type("Word (de)", "Kater");
    await answerCat(rendered);
    expect(fieldValue("Definition (en)")).toBe("");
  });

  describe("when Save is pressed before the answer", () => {
    async function pressSaveBeforeAnswer() {
      const rendered = await openBeforeAnswer();
      fireEvent.click(screen.getByRole("button", { name: "Save" }));
      return rendered;
    }

    it("says that it waits for the definitions", async () => {
      await pressSaveBeforeAnswer();
      expect(
        within(screen.getByRole("form", { name: "Flashcard" })).getByRole(
          "status",
        ).textContent,
      ).toBe("Waiting for definitions…");
    });

    it("sends nothing while it waits, so that no answer can arrive during the save", async () => {
      const rendered = await pressSaveBeforeAnswer();
      expect(creations(rendered)).toEqual([]);
    });

    it("saves the flashcard filled from the answer once it arrives", async () => {
      const rendered = await pressSaveBeforeAnswer();
      await rendered.client.answerLookup(catLookup);
      await vi.waitFor(() =>
        expect(createdContent(rendered)?.word).toBe("fressen"),
      );
    });

    it("keeps the word as it was once Save is pressed", async () => {
      await pressSaveBeforeAnswer();
      type("Word (de)", "Kater");
      expect(fieldValue("Word (de)")).toBe("cat");
    });

    it("saves a definition typed in before Save as typed, with the word from the answer", async () => {
      const rendered = await openBeforeAnswer();
      type("Definition (en)", "a small pet");
      fireEvent.click(screen.getByRole("button", { name: "Save" }));
      await rendered.client.answerLookup(catLookup);
      await vi.waitFor(() =>
        expect(createdContent(rendered)).toMatchObject({
          word: "fressen",
          l1_definition: "a small pet",
        }),
      );
    });

    it("saves the flashcard as it is once the lookup fails", async () => {
      const rendered = await pressSaveBeforeAnswer();
      await rendered.client.failLookup(catLookup);
      await vi.waitFor(() =>
        expect(createdContent(rendered)?.word).toBe("cat"),
      );
    });
  });

  it("saves a double-clicked word's flashcard with the word once the save has waited its limit for an answer", async () => {
    const rendered = renderMediaScreen({ heldLookups: [catLookup] });
    await findSubtitles();
    doubleClick(panelWord("cat"));
    // Only C1's own wait, a timeout in the flashcard hooks, runs on Vitest's fake clock.
    vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });
    rendered.advanceClock(1500);
    await vi.advanceTimersByTimeAsync(saveLookupWaitMs);
    vi.useRealTimers();
    expect((await findCreatedDraft(rendered.client)).content.word).toBe("cat");
  });
});
