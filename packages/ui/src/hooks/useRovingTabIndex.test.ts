import { act, renderHook } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import {
  findRovingTargetIndex,
  useRovingTabIndex,
} from "./useRovingTabIndex.ts";

describe("useRovingTabIndex", () => {
  it("makes the first item the tab stop", () => {
    const { result } = renderHook(() => useRovingTabIndex(3));
    expect(result.current.tabIndexOf(0)).toBe(0);
  });

  it("takes the other items out of the tab order", () => {
    const { result } = renderHook(() => useRovingTabIndex(3));
    expect(result.current.tabIndexOf(1)).toBe(-1);
  });

  it("makes a focused item the tab stop", () => {
    const { result } = renderHook(() => useRovingTabIndex(3));
    act(() => result.current.handleItemFocused(2));
    expect(result.current.tabIndexOf(2)).toBe(0);
  });

  it("makes the last item the tab stop when fewer items remain than the current index", () => {
    const { result, rerender } = renderHook(
      ({ itemCount }) => useRovingTabIndex(itemCount),
      { initialProps: { itemCount: 5 } },
    );
    act(() => result.current.handleItemFocused(4));
    rerender({ itemCount: 2 });
    expect(result.current.tabIndexOf(1)).toBe(0);
  });
});

describe("findRovingTargetIndex", () => {
  it("moves to the next item on ArrowRight", () => {
    expect(findRovingTargetIndex("ArrowRight", 1, 3)).toBe(2);
  });

  it("moves to the next item on ArrowDown", () => {
    expect(findRovingTargetIndex("ArrowDown", 1, 3)).toBe(2);
  });

  it("moves to the previous item on ArrowLeft", () => {
    expect(findRovingTargetIndex("ArrowLeft", 1, 3)).toBe(0);
  });

  it("moves to the previous item on ArrowUp", () => {
    expect(findRovingTargetIndex("ArrowUp", 1, 3)).toBe(0);
  });

  it("stays at the last item on ArrowRight", () => {
    expect(findRovingTargetIndex("ArrowRight", 2, 3)).toBe(2);
  });

  it("stays at the first item on ArrowLeft", () => {
    expect(findRovingTargetIndex("ArrowLeft", 0, 3)).toBe(0);
  });

  it("moves to the first item on Home", () => {
    expect(findRovingTargetIndex("Home", 2, 3)).toBe(0);
  });

  it("moves to the last item on End", () => {
    expect(findRovingTargetIndex("End", 0, 3)).toBe(2);
  });

  it("ignores other keys", () => {
    expect(findRovingTargetIndex("a", 0, 3)).toBeUndefined();
  });
});
