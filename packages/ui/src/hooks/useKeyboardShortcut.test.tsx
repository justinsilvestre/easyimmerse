import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { useKeyboardShortcut } from "./useKeyboardShortcut.ts";

afterEach(cleanup);

function ShortcutProbe({ onPress }: { onPress: () => void }) {
  useKeyboardShortcut("l", onPress);
  return <input aria-label="Notes" />;
}

function renderProbe() {
  let pressCount = 0;
  render(<ShortcutProbe onPress={() => (pressCount += 1)} />);
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
});
