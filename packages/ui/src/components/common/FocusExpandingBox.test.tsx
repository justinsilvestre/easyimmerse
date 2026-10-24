import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { FocusExpandingBox } from "./FocusExpandingBox.tsx";

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

/** Makes every box report its content as `contentHeight` tall and itself as `boxHeight` tall. */
function stubHeights(contentHeight: number, boxHeight: number) {
  vi.spyOn(HTMLDivElement.prototype, "scrollHeight", "get").mockReturnValue(
    contentHeight,
  );
  vi.spyOn(HTMLDivElement.prototype, "clientHeight", "get").mockReturnValue(
    boxHeight,
  );
}

const renderBox = () =>
  render(
    <FocusExpandingBox>
      <p>A long definition</p>
    </FocusExpandingBox>,
  );

const box = () => screen.getByText("A long definition").parentElement;

describe("FocusExpandingBox", () => {
  it("marks its content as cut off when the content is taller than the box", () => {
    stubHeights(300, 128);
    renderBox();
    expect(box()?.hasAttribute("data-cut-off")).toBe(true);
  });

  it("leaves content that fits unmarked", () => {
    stubHeights(40, 40);
    renderBox();
    expect(box()?.hasAttribute("data-cut-off")).toBe(false);
  });
});
