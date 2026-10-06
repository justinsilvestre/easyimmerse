import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { useRef } from "react";
import { afterEach, describe, expect, it } from "vitest";
import { useKeyboardShortcut } from "./useKeyboardShortcut.ts";

afterEach(cleanup);

type ProbeOptions = {
  keys?: string | readonly string[];
  isInert?: boolean;
  hasDialog?: boolean;
};

function ShortcutProbe({
  onPress,
  keys = "l",
  isInert = false,
  hasDialog = false,
}: ProbeOptions & { onPress: () => void }) {
  const scopeRef = useRef<HTMLDivElement>(null);
  useKeyboardShortcut(keys, onPress, scopeRef);
  return (
    <>
      <div ref={scopeRef} inert={isInert}>
        <input aria-label="Notes" />
        <button type="button">Save</button>
        <a href="#help">Help</a>
      </div>
      {hasDialog && <dialog open aria-label="Tracks" />}
    </>
  );
}

function renderProbe(options: ProbeOptions = {}) {
  let pressCount = 0;
  render(<ShortcutProbe onPress={() => (pressCount += 1)} {...options} />);
  return () => pressCount;
}

describe("useKeyboardShortcut", () => {
  it("calls back when the key is pressed", () => {
    const pressCount = renderProbe();
    fireEvent.keyDown(document.body, { key: "l" });
    expect(pressCount()).toBe(1);
  });

  it("ignores the key while the user types into a field", () => {
    const pressCount = renderProbe();
    fireEvent.keyDown(screen.getByRole("textbox", { name: "Notes" }), {
      key: "l",
    });
    expect(pressCount()).toBe(0);
  });

  it("ignores the key pressed with a modifier", () => {
    const pressCount = renderProbe();
    fireEvent.keyDown(document.body, { key: "l", metaKey: true });
    expect(pressCount()).toBe(0);
  });

  it("ignores the key while its screen lies inert beneath another", () => {
    const pressCount = renderProbe({ isInert: true });
    fireEvent.keyDown(document.body, { key: "l" });
    expect(pressCount()).toBe(0);
  });

  it("ignores the key while a modal dialog is open", () => {
    const pressCount = renderProbe({ hasDialog: true });
    fireEvent.keyDown(document.body, { key: "l" });
    expect(pressCount()).toBe(0);
  });

  it("calls back for each of several keys", () => {
    const pressCount = renderProbe({ keys: [" ", "k"] });
    fireEvent.keyDown(document.body, { key: " " });
    fireEvent.keyDown(document.body, { key: "K" });
    expect(pressCount()).toBe(2);
  });

  it("calls back for a key pressed on a focused button", () => {
    const pressCount = renderProbe({ keys: "k" });
    fireEvent.keyDown(screen.getByRole("button", { name: "Save" }), {
      key: "k",
    });
    expect(pressCount()).toBe(1);
  });

  it("leaves Space to a focused button", () => {
    const pressCount = renderProbe({ keys: " " });
    fireEvent.keyDown(screen.getByRole("button", { name: "Save" }), {
      key: " ",
    });
    expect(pressCount()).toBe(0);
  });

  it("leaves Space to a focused link", () => {
    const pressCount = renderProbe({ keys: " " });
    fireEvent.keyDown(screen.getByRole("link", { name: "Help" }), {
      key: " ",
    });
    expect(pressCount()).toBe(0);
  });
});
