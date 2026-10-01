import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
} from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { TokenizedText } from "./TokenizedText.tsx";

afterEach(cleanup);

describe("TokenizedText", () => {
  it("renders one button per word", () => {
    render(<TokenizedText text="The cat is sleeping." />);
    expect(screen.getAllByRole("button")).toHaveLength(4);
  });

  it("marks each word button with a data-word attribute", () => {
    render(<TokenizedText text="Good night." />);
    expect(
      screen.getByRole("button", { name: "night" }).hasAttribute("data-word"),
    ).toBe(true);
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

  describe("for keyboard navigation", () => {
    it("puts only the first word in the tab order", () => {
      render(<TokenizedText text="The cat sleeps." />);
      expect(
        screen.getAllByRole("button").map((button) => button.tabIndex),
      ).toEqual([0, -1, -1]);
    });

    it("moves focus to the next word on ArrowRight", () => {
      render(<TokenizedText text="The cat sleeps." />);
      pressKeyOnWord("The", "ArrowRight");
      expect(document.activeElement).toBe(
        screen.getByRole("button", { name: "cat" }),
      );
    });

    it("keeps focus on the first word on ArrowLeft", () => {
      render(<TokenizedText text="The cat sleeps." />);
      pressKeyOnWord("The", "ArrowLeft");
      expect(document.activeElement).toBe(
        screen.getByRole("button", { name: "The" }),
      );
    });

    it("moves focus to the last word on End", () => {
      render(<TokenizedText text="The cat sleeps." />);
      pressKeyOnWord("The", "End");
      expect(document.activeElement).toBe(
        screen.getByRole("button", { name: "sleeps" }),
      );
    });

    it("makes a clicked word the tab stop", () => {
      render(<TokenizedText text="The cat sleeps." />);
      fireEvent.click(screen.getByRole("button", { name: "sleeps" }));
      expect(screen.getByRole("button", { name: "sleeps" }).tabIndex).toBe(0);
    });

    it("reports the word it moves focus to as hovered", () => {
      const hovered: string[] = [];
      render(
        <TokenizedText
          text="The cat sleeps."
          onWordHovered={(w) => hovered.push(w)}
        />,
      );
      pressKeyOnWord("The", "ArrowRight");
      expect(hovered).toEqual(["The", "cat"]);
    });

    it("keeps the arrow keys it handles from reaching enclosing elements", () => {
      const keysReachingParent: string[] = [];
      render(
        <section
          aria-label="Player"
          onKeyDown={(event) => keysReachingParent.push(event.key)}
        >
          <TokenizedText text="The cat sleeps." />
        </section>,
      );
      pressKeyOnWord("The", "ArrowRight");
      expect(keysReachingParent).toEqual([]);
    });

    it("lets keys it does not handle reach enclosing elements", () => {
      const keysReachingParent: string[] = [];
      render(
        <section
          aria-label="Player"
          onKeyDown={(event) => keysReachingParent.push(event.key)}
        >
          <TokenizedText text="The cat sleeps." />
        </section>,
      );
      pressKeyOnWord("The", " ");
      expect(keysReachingParent).toEqual([" "]);
    });

    it("keeps focus in place on an arrow key pressed with a modifier", () => {
      render(<TokenizedText text="The cat sleeps." />);
      pressKeyOnWord("The", "ArrowRight", { shiftKey: true });
      expect(document.activeElement).toBe(
        screen.getByRole("button", { name: "The" }),
      );
    });

    it("moves focus between the new words after the text changes", () => {
      const { rerender } = render(<TokenizedText text="The cat sleeps." />);
      rerender(<TokenizedText text="A dog barks." />);
      pressKeyOnWord("A", "ArrowRight");
      expect(document.activeElement).toBe(
        screen.getByRole("button", { name: "dog" }),
      );
    });
  });
});

function pressKeyOnWord(
  word: string,
  key: string,
  modifiers: { shiftKey?: boolean } = {},
) {
  const button = screen.getByRole("button", { name: word });
  act(() => button.focus());
  fireEvent.keyDown(button, { key, ...modifiers });
}
