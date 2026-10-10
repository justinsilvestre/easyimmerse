import { cleanup, fireEvent, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  findSubtitles,
  renderMediaScreen,
} from "../testSupport/renderMediaScreen.tsx";

afterEach(cleanup);

const catLookup = "cat is sleeping.";

const panelWord = (word: string) =>
  within(screen.getByRole("list", { name: "Subtitles" })).getByRole("button", {
    name: word,
  });

const fieldValue = (label: string) =>
  (screen.getByLabelText(label) as HTMLTextAreaElement).value;

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
});
