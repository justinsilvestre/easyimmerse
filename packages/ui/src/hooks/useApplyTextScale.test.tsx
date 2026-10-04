import { actions } from "@easyimmerse/state";
import { act, cleanup } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { renderWithAppStore } from "../testSupport/renderWithAppStore.tsx";
import { useApplyTextScale } from "./useApplyTextScale.ts";

afterEach(() => {
  cleanup();
  document.documentElement.style.fontSize = "";
});

function TextScaleProbe() {
  useApplyTextScale();
  return null;
}

describe("useApplyTextScale", () => {
  it("leaves the root font size alone at the default scale", () => {
    renderWithAppStore(<TextScaleProbe />);
    expect(document.documentElement.style.fontSize).toBe("");
  });

  it("sets the root font size to the chosen scale", () => {
    const { store } = renderWithAppStore(<TextScaleProbe />);
    act(() => {
      store.dispatch(actions.textScaleChosen(125));
    });
    expect(document.documentElement.style.fontSize).toBe("125%");
  });
});
