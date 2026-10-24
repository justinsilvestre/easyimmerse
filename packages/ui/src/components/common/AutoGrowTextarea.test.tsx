import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { AutoGrowTextarea } from "./AutoGrowTextarea.tsx";

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

/** Makes every textarea report `height` as the height of its text. */
function stubTextHeight(height: number) {
  return vi
    .spyOn(HTMLTextAreaElement.prototype, "scrollHeight", "get")
    .mockReturnValue(height);
}

/** Renders the textarea with `value` inside a parent element, and returns a rerender with another value. */
function renderTextarea(value: string) {
  const rendered = render(
    <div data-testid="parent">
      <AutoGrowTextarea aria-label="Text" value={value} readOnly />
    </div>,
  );
  return (next: string) =>
    rendered.rerender(
      <div data-testid="parent">
        <AutoGrowTextarea aria-label="Text" value={next} readOnly />
      </div>,
    );
}

const textarea = () =>
  screen.getByRole<HTMLTextAreaElement>("textbox", { name: "Text" });

describe("AutoGrowTextarea", () => {
  it("fits its height to its text", () => {
    stubTextHeight(48);
    renderTextarea("Hund");
    expect(textarea().style.height).toBe("48px");
  });

  it("keeps its height when it renders again with the same text", () => {
    const rerender = renderTextarea("Hund");
    textarea().style.height = "7px";
    rerender("Hund");
    expect(textarea().style.height).toBe("7px");
  });

  it("fits its height again when its text changes", () => {
    const rerender = renderTextarea("Hund");
    stubTextHeight(64);
    rerender("Hündin");
    expect(textarea().style.height).toBe("64px");
  });

  it("holds its parent's height while it measures, so that the content around it does not shrink", () => {
    let heldHeight: string | undefined;
    vi.spyOn(HTMLDivElement.prototype, "offsetHeight", "get").mockReturnValue(
      90,
    );
    stubTextHeight(48).mockImplementation(() => {
      heldHeight = screen.getByTestId("parent").style.minHeight;
      return 48;
    });
    renderTextarea("Hund");
    expect(heldHeight).toBe("90px");
  });

  it("lets go of its parent's height once it has measured", () => {
    vi.spyOn(HTMLDivElement.prototype, "offsetHeight", "get").mockReturnValue(
      90,
    );
    renderTextarea("Hund");
    expect(screen.getByTestId("parent").style.minHeight).toBe("");
  });
});
