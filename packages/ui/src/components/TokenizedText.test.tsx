import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { TokenizedText } from "./TokenizedText.tsx";

afterEach(cleanup);

describe("TokenizedText", () => {
  it("renders one button per word", () => {
    render(<TokenizedText text="The cat is sleeping." />);
    expect(screen.getAllByRole("button")).toHaveLength(4);
  });

  it("reports the hovered word", () => {
    const hovered: string[] = [];
    render(
      <TokenizedText
        text="Good night."
        onWordHovered={(w) => hovered.push(w)}
      />,
    );
    fireEvent.mouseEnter(screen.getByRole("button", { name: "night" }));
    expect(hovered).toEqual(["night"]);
  });

  it("reports the focused word as hovered", () => {
    const hovered: string[] = [];
    render(
      <TokenizedText
        text="Good night."
        onWordHovered={(w) => hovered.push(w)}
      />,
    );
    fireEvent.focus(screen.getByRole("button", { name: "Good" }));
    expect(hovered).toEqual(["Good"]);
  });

  it("reports the clicked word as activated", () => {
    const activated: string[] = [];
    render(
      <TokenizedText
        text="Good night."
        onWordActivated={(w) => activated.push(w)}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: "night" }));
    expect(activated).toEqual(["night"]);
  });
});
