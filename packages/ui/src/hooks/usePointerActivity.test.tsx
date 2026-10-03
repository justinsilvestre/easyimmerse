import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
} from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { usePointerActivity } from "./usePointerActivity.ts";

beforeEach(() => vi.useFakeTimers());

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

function ActivityProbe() {
  const { isActive, onPointerMove } = usePointerActivity();
  return (
    <section aria-label="Stage" onPointerMove={onPointerMove}>
      <output>{String(isActive)}</output>
    </section>
  );
}

const readProbe = () => screen.getByRole("status").textContent;

describe("usePointerActivity", () => {
  it("counts the pointer as active at first", () => {
    render(<ActivityProbe />);
    expect(readProbe()).toBe("true");
  });

  it("counts the pointer as idle once it has rested for a while", () => {
    render(<ActivityProbe />);
    act(() => vi.advanceTimersByTime(3000));
    expect(readProbe()).toBe("false");
  });

  it("counts the pointer as active again when it moves", () => {
    render(<ActivityProbe />);
    act(() => vi.advanceTimersByTime(3000));
    fireEvent.pointerMove(screen.getByRole("region", { name: "Stage" }));
    expect(readProbe()).toBe("true");
  });
});
