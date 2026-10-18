import type { KeyPress } from "@easyimmerse/state";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { keyPressOf } from "./keyPressOf.ts";

afterEach(cleanup);

function Page({ hasDialog = false }: { hasDialog?: boolean }) {
  return (
    <>
      <input aria-label="Notes" />
      <button type="button">Save</button>
      <a href="#help">Help</a>
      {/* biome-ignore lint/a11y/useSemanticElements: a word of the subtitles is a span with the button role. */}
      <span role="button" tabIndex={0}>
        Hund
      </span>
      <div role="menu" aria-label="Speed">
        <button type="button" role="menuitemradio" aria-checked="true">
          1×
        </button>
      </div>
      {hasDialog && <dialog open aria-label="Tracks" />}
    </>
  );
}

/** Presses a key on the element, as the page's listener on the document sees it. */
function pressOn(target: Element, init: KeyboardEventInit = {}): KeyPress {
  const presses: KeyPress[] = [];
  const listen = (event: KeyboardEvent) => presses.push(keyPressOf(event));
  document.addEventListener("keydown", listen);
  target.dispatchEvent(
    new KeyboardEvent("keydown", {
      key: "k",
      bubbles: true,
      cancelable: true,
      ...init,
    }),
  );
  document.removeEventListener("keydown", listen);
  const [press] = presses;
  if (!press) throw new Error("The key did not reach the document.");
  return press;
}

describe("keyPressOf", () => {
  describe("tells what has focus", () => {
    it("as the page when nothing in particular has it", () => {
      render(<Page />);
      expect(pressOn(document.body).focus).toBe("page");
    });

    it("as a form field for a text box", () => {
      render(<Page />);
      const field = screen.getByRole("textbox", { name: "Notes" });
      expect(pressOn(field).focus).toBe("formField");
    });

    it("as a control for a button", () => {
      render(<Page />);
      const button = screen.getByRole("button", { name: "Save" });
      expect(pressOn(button).focus).toBe("control");
    });

    it("as a control for a link", () => {
      render(<Page />);
      expect(pressOn(screen.getByRole("link")).focus).toBe("control");
    });

    it("as a control for an element with the button role", () => {
      render(<Page />);
      const word = screen.getByRole("button", { name: "Hund" });
      expect(pressOn(word).focus).toBe("control");
    });

    it("as a menu for an item of an open menu", () => {
      render(<Page />);
      const item = screen.getByRole("menuitemradio", { name: "1×" });
      expect(pressOn(item).focus).toBe("menu");
    });
  });

  it("tells that a modal dialog is open", () => {
    render(<Page hasDialog />);
    expect(pressOn(document.body).isDialogOpen).toBe(true);
  });

  it("tells that no modal dialog is open", () => {
    render(<Page />);
    expect(pressOn(document.body).isDialogOpen).toBe(false);
  });

  it("tells that the focused element has handled the key", () => {
    render(<Page />);
    const button = screen.getByRole("button", { name: "Save" });
    button.addEventListener("keydown", (event) => event.preventDefault());
    expect(pressOn(button).isHandled).toBe(true);
  });

  it("counts Ctrl as the command key", () => {
    render(<Page />);
    expect(pressOn(document.body, { ctrlKey: true }).hasCommandKey).toBe(true);
  });

  it("counts Cmd as the command key", () => {
    render(<Page />);
    expect(pressOn(document.body, { metaKey: true }).hasCommandKey).toBe(true);
  });
});
