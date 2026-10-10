import type { NoticeContent } from "@easyimmerse/state";
import { actions } from "@easyimmerse/state";
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
} from "@testing-library/react";
import { Provider } from "react-redux";
import { afterEach, describe, expect, it } from "vitest";
import { createTestAppStore } from "../testSupport/createTestAppStore.ts";
import { NoticeRegion } from "./NoticeRegion.tsx";

afterEach(cleanup);

const saved: NoticeContent = {
  tone: "success",
  message: "Saved the flashcard for “Hund”.",
  buttons: [
    {
      label: "Undo",
      action: actions.externalLinkRequested("https://example.com/undo"),
    },
  ],
  isTransient: true,
};

/** Renders the region over a fresh store showing the given notice. */
function renderRegion(content: NoticeContent) {
  const { store, effects } = createTestAppStore();
  store.dispatch(actions.noticeRequested(content));
  render(
    <Provider store={store}>
      <NoticeRegion />
    </Provider>,
  );
  return effects;
}

describe("NoticeRegion", () => {
  it("announces a failure as an alert", () => {
    renderRegion({
      tone: "danger",
      message: "Couldn't save the flashcard for “Hund”.",
      buttons: [],
      isTransient: false,
    });
    expect(screen.getByRole("alert").textContent).toContain(
      "Couldn't save the flashcard for “Hund”.",
    );
  });

  it("does what a chosen button says", () => {
    const effects = renderRegion(saved);
    fireEvent.click(screen.getByRole("button", { name: "Undo" }));
    expect(effects.calls).toContainEqual({
      type: "openExternalUrl",
      url: "https://example.com/undo",
    });
  });

  it("keeps a transient notice while the pointer rests on it", () => {
    const effects = renderRegion(saved);
    fireEvent.pointerEnter(screen.getByText(saved.message));
    act(() => effects.clock.advanceBy(20_000));
    expect(screen.queryByText(saved.message)).not.toBeNull();
  });

  it("announces other notices politely, apart from failures", () => {
    renderRegion(saved);
    expect(
      screen
        .getByText(saved.message)
        .closest("[aria-live]")
        ?.getAttribute("aria-live"),
    ).toBe("polite");
  });

  it("keeps a transient notice while focus moves between its own buttons", () => {
    const effects = renderRegion(saved);
    const undo = screen.getByRole("button", { name: "Undo" });
    fireEvent.focus(undo);
    fireEvent.blur(undo, {
      relatedTarget: screen.getByRole("button", { name: "Dismiss" }),
    });
    act(() => effects.clock.advanceBy(20_000));
    expect(screen.queryByText(saved.message)).not.toBeNull();
  });
});
