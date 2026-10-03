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
  const { isActive, isNearTop, ...handlers } = usePointerActivity();
  return (
    <section aria-label="Stage" {...handlers}>
      <output>{`${isActive} ${isNearTop}`}</output>
    </section>
  );
}

const readProbe = () => screen.getByRole("status").textContent;

describe("usePointerActivity", () => {
  it("counts the pointer as active at first", () => {
    render(<ActivityProbe />);
    expect(readProbe()).toBe("true false");
  });

  it("counts the pointer as idle once it has rested for a while", () => {
    render(<ActivityProbe />);
    act(() => vi.advanceTimersByTime(3000));
    expect(readProbe()).toBe("false false");
  });

  it("counts the pointer as active again when it moves", () => {
    render(<ActivityProbe />);
    act(() => vi.advanceTimersByTime(3000));
    fireEvent.pointerMove(screen.getByRole("region", { name: "Stage" }), {
      clientY: 200,
    });
    expect(readProbe()).toBe("true false");
  });

  it("notices the pointer near the top", () => {
    render(<ActivityProbe />);
    fireEvent.pointerMove(screen.getByRole("region", { name: "Stage" }), {
      clientY: 10,
    });
    expect(readProbe()).toBe("true true");
  });

  it("forgets the pointer's place when it leaves", () => {
    render(<ActivityProbe />);
    const stage = screen.getByRole("region", { name: "Stage" });
    fireEvent.pointerMove(stage, { clientY: 10 });
    fireEvent.pointerLeave(stage);
    expect(readProbe()).toBe("true false");
  });
});
