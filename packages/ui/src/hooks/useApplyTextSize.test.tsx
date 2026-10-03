import { actions } from "@easyimmerse/state";
import { act, cleanup } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { renderWithAppStore } from "../testSupport/renderWithAppStore.tsx";
import { useApplyTextSize } from "./useApplyTextSize.ts";

afterEach(() => {
  cleanup();
  delete document.documentElement.dataset.textSize;
});

function TextSizeProbe() {
  useApplyTextSize();
  return null;
}

describe("useApplyTextSize", () => {
  it("marks the document with the medium size at first", () => {
    renderWithAppStore(<TextSizeProbe />);
    expect(document.documentElement.dataset.textSize).toBe("medium");
  });

  it("marks the document with the chosen size", () => {
    const { store } = renderWithAppStore(<TextSizeProbe />);
    act(() => {
      store.dispatch(actions.textSizeChosen("large"));
    });
    expect(document.documentElement.dataset.textSize).toBe("large");
  });
});
