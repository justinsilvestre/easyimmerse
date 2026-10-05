import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { useRef } from "react";
import { afterEach, describe, expect, it } from "vitest";
import { useKeyboardShortcut } from "./useKeyboardShortcut.ts";

afterEach(cleanup);

function ShortcutProbe({
  onPress,
  isInert = false,
  hasDialog = false,
}: {
  onPress: () => void;
  isInert?: boolean;
  hasDialog?: boolean;
}) {
  const scopeRef = useRef<HTMLDivElement>(null);
  useKeyboardShortcut("l", onPress, scopeRef);
  return (
    <>
      <div ref={scopeRef} inert={isInert}>
        <input aria-label="Notes" />
      </div>
      {hasDialog && <dialog open aria-label="Tracks" />}
    </>
  );
}

function renderProbe(options: { isInert?: boolean; hasDialog?: boolean } = {}) {
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
});
