import { cleanup, fireEvent, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  findSubtitles,
  renderMediaScreen,
} from "../testSupport/renderMediaScreen.tsx";

afterEach(cleanup);

// The cards other than the one under the mouse keep their props, as the tests of `cursorIn` and `activeWordIn` check,
// so each commit renders only that card. The bound counts the commits a hover makes:
// the cursor pointed at the word, the cached match length once the hover lookup is fulfilled, and the cursor answered.
describe("MediaScreen renders", () => {
  it("commits the subtitles panel at most three times while the mouse moves onto a word and its lookup answers", async () => {
    const commits = { count: 0 };
    renderMediaScreen({ onSubtitlesCommit: () => commits.count++ });
    const list = await findSubtitles();
    const dog = within(list).getByRole("button", { name: "dog" });
    commits.count = 0;
    fireEvent.pointerEnter(dog, { pointerType: "mouse" });
    await vi.waitFor(() =>
      expect(dog.classList.contains("bg-accent-soft")).toBe(true),
    );
    expect(commits.count).toBeLessThanOrEqual(3);
  });
});
