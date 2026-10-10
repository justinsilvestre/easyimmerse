import { actions } from "@easyimmerse/state";
import {
  act,
  cleanup,
  fireEvent,
  screen,
  within,
} from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  findSubtitles,
  openFlashcardFor,
  renderMediaScreen,
} from "../testSupport/renderMediaScreen.tsx";

afterEach(cleanup);

const viewRenders = vi.hoisted(() => ({ count: 0 }));

// The view renders whenever the screen does, so counting its renders counts the screen's, apart from those of the components inside it.
vi.mock("../media/MediaView.tsx", async (importOriginal) => {
  const original =
    await importOriginal<typeof import("../media/MediaView.tsx")>();
  return {
    ...original,
    MediaView: (props: Parameters<typeof original.MediaView>[0]) => {
      viewRenders.count++;
      return original.MediaView(props);
    },
  };
});

/** Moves the player's time to each of the given seconds in turn. */
function tick(
  store: ReturnType<typeof renderMediaScreen>["store"],
  seconds: readonly number[],
) {
  for (const second of seconds)
    act(() => store.dispatch(actions.playerTimeChanged(second)));
}

/** Waits until no request of the backend is pending, such as the lookups of the cues ahead. */
async function settleRequests(
  store: ReturnType<typeof renderMediaScreen>["store"],
) {
  await vi.waitFor(() => {
    const { queries } = store.getState().backend as {
      queries: Record<string, { status: string } | undefined>;
    };
    if (Object.values(queries).some((query) => query?.status === "pending"))
      throw new Error("A request is still pending.");
  });
}

// The cards other than the one under the mouse keep their props, as the tests of `cursorIn` and `activeWordIn` check,
// so each commit renders only that card. The bound counts the commits a hover makes:
// the cursor pointed at the word, the cached match length once the hover lookup is fulfilled, and the cursor answered.
describe("MediaScreen renders", () => {
  it("commits the screen at most three times while the mouse moves onto a word and its lookup answers", async () => {
    const commits = { count: 0 };
    renderMediaScreen({ onCommit: () => commits.count++ });
    const list = await findSubtitles();
    const dog = within(list).getByRole("button", { name: "dog" });
    commits.count = 0;
    fireEvent.pointerEnter(dog, { pointerType: "mouse" });
    await vi.waitFor(() =>
      expect(dog.classList.contains("bg-accent-soft")).toBe(true),
    );
    expect(commits.count).toBeLessThanOrEqual(3);
  });

  it("does not render the screen again while the player's time moves within a cue", async () => {
    const { store } = renderMediaScreen();
    await findSubtitles();
    tick(store, [0.6]);
    await settleRequests(store);
    viewRenders.count = 0;
    tick(store, [0.7, 0.8, 0.9, 1.0, 1.1]);
    expect(viewRenders.count).toBe(0);
  });

  it("renders the screen once when the time moves into the next cue, and not again when the lookups ahead answer", async () => {
    const { store } = renderMediaScreen();
    await findSubtitles();
    tick(store, [0.6]);
    await settleRequests(store);
    viewRenders.count = 0;
    tick(store, [1.4, 1.6, 1.8, 1.9]);
    await settleRequests(store);
    expect(viewRenders.count).toBe(1);
  });

  it("does not render the screen again while a field of the open flashcard is typed in", async () => {
    renderMediaScreen();
    const list = await findSubtitles();
    await openFlashcardFor(within(list).getByRole("button", { name: "cat" }));
    const form = screen.getByRole("form", { name: "Flashcard" });
    const field = within(form).getAllByRole("textbox")[0] as HTMLElement;
    viewRenders.count = 0;
    for (const value of ["c", "ca", "cat"])
      fireEvent.change(field, { target: { value } });
    expect(viewRenders.count).toBe(0);
  });
});
