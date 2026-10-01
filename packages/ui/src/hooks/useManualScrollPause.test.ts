import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useManualScrollPause } from "./useManualScrollPause.ts";

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

describe("useManualScrollPause", () => {
  it("is not paused before the user scrolls", () => {
    const { result } = renderHook(useManualScrollPause);
    expect(result.current.isPaused()).toBe(false);
  });

  it("is paused right after the user scrolls with the wheel", () => {
    const { result } = renderHook(useManualScrollPause);
    act(() => result.current.handlers.onWheel());
    expect(result.current.isPaused()).toBe(true);
  });

  it("is still paused three seconds after a touch scroll", () => {
    const { result } = renderHook(useManualScrollPause);
    act(() => result.current.handlers.onTouchMove());
    vi.advanceTimersByTime(3000);
    expect(result.current.isPaused()).toBe(true);
  });

  it("is no longer paused four seconds after the user scrolled", () => {
    const { result } = renderHook(useManualScrollPause);
    act(() => result.current.handlers.onWheel());
    vi.advanceTimersByTime(4000);
    expect(result.current.isPaused()).toBe(false);
  });
});
