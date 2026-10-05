import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
} from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NoticesProvider } from "./NoticesContext.tsx";
import { createNoticeStore, noticeTimeoutMs } from "./noticeStore.ts";

beforeEach(() => vi.useFakeTimers());

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

function renderRegion() {
  const store = createNoticeStore();
  render(
    <NoticesProvider store={store}>
      <button type="button">Elsewhere</button>
    </NoticesProvider>,
  );
  return store;
}

const showUndo = (
  store: ReturnType<typeof createNoticeStore>,
  onUndo = () => undefined,
) =>
  act(() => {
    store.show({
      tone: "success",
      message: "Saved the flashcard for “Hund”.",
      actions: [{ label: "Undo", onSelect: onUndo }],
      isTransient: true,
    });
  });

describe("NoticeRegion", () => {
  it("announces a notice through a live region", () => {
    const store = renderRegion();
    showUndo(store);
    expect(
      screen
        .getByText("Saved the flashcard for “Hund”.")
        .closest("[aria-live]"),
    ).not.toBeNull();
  });

  it("offers the notice's action as a button", () => {
    let undoCount = 0;
    const store = renderRegion();
    showUndo(store, () => {
      undoCount += 1;
    });
    fireEvent.click(screen.getByRole("button", { name: "Undo" }));
    expect(undoCount).toBe(1);
  });

  it("dismisses a notice once its action is chosen", () => {
    const store = renderRegion();
    showUndo(store);
    fireEvent.click(screen.getByRole("button", { name: "Undo" }));
    expect(screen.queryByText("Saved the flashcard for “Hund”.")).toBeNull();
  });

  it("lets a transient notice go after its time", () => {
    const store = renderRegion();
    showUndo(store);
    act(() => vi.advanceTimersByTime(noticeTimeoutMs));
    expect(screen.queryByText("Saved the flashcard for “Hund”.")).toBeNull();
  });

  it("keeps a transient notice while it has keyboard focus", () => {
    const store = renderRegion();
    showUndo(store);
    fireEvent.focus(screen.getByRole("button", { name: "Undo" }));
    act(() => vi.advanceTimersByTime(noticeTimeoutMs * 2));
    expect(screen.getByText("Saved the flashcard for “Hund”.")).toBeDefined();
  });

  it("keeps a transient notice while the pointer rests on it", () => {
    const store = renderRegion();
    showUndo(store);
    fireEvent.pointerEnter(screen.getByText("Saved the flashcard for “Hund”."));
    act(() => vi.advanceTimersByTime(noticeTimeoutMs * 2));
    expect(screen.getByText("Saved the flashcard for “Hund”.")).toBeDefined();
  });

  it("keeps a lasting notice until it is dismissed", () => {
    const store = renderRegion();
    act(() => {
      store.show({
        tone: "danger",
        message: "Couldn't save the flashcard for “Hund”.",
        isTransient: false,
      });
    });
    act(() => vi.advanceTimersByTime(noticeTimeoutMs * 10));
    expect(
      screen.getByText("Couldn't save the flashcard for “Hund”."),
    ).toBeDefined();
  });

  it("can take an action off a notice", () => {
    const store = renderRegion();
    let id = 0;
    act(() => {
      id = store.show({
        tone: "danger",
        message: "Couldn't save the flashcard for “Hund”.",
        actions: [
          { label: "Retry", onSelect: () => undefined },
          { label: "Reopen", onSelect: () => undefined },
        ],
        isTransient: false,
      });
    });
    act(() => store.withdrawAction(id, "Reopen"));
    expect(screen.queryByRole("button", { name: "Reopen" })).toBeNull();
  });

  it("announces a failure as an alert", () => {
    const store = renderRegion();
    act(() => {
      store.show({
        tone: "danger",
        message: "Couldn't save the flashcard for “Hund”.",
        isTransient: false,
      });
    });
    expect(screen.getByRole("alert").textContent).toContain(
      "Couldn't save the flashcard for “Hund”.",
    );
  });

  it("announces other notices politely, apart from failures", () => {
    const store = renderRegion();
    showUndo(store);
    expect(
      screen
        .getByText("Saved the flashcard for “Hund”.")
        .closest("[aria-live]")
        ?.getAttribute("aria-live"),
    ).toBe("polite");
  });

  describe("when a notice has something to do on dismissal", () => {
    function showWithDismissal(store: ReturnType<typeof createNoticeStore>) {
      const dismissals: string[] = [];
      act(() => {
        store.show({
          tone: "danger",
          message: "Couldn't save the flashcard for “Hund”.",
          actions: [{ label: "Retry", onSelect: () => undefined }],
          isTransient: false,
          onDismiss: () => dismissals.push("dismissed"),
        });
      });
      return dismissals;
    }

    it("does it once the user dismisses the notice", () => {
      const store = renderRegion();
      const dismissals = showWithDismissal(store);
      fireEvent.click(screen.getByRole("button", { name: "Dismiss" }));
      expect(dismissals).toEqual(["dismissed"]);
    });

    it("leaves it undone when one of the notice's actions is chosen", () => {
      const store = renderRegion();
      const dismissals = showWithDismissal(store);
      fireEvent.click(screen.getByRole("button", { name: "Retry" }));
      expect(dismissals).toEqual([]);
    });
  });
});
