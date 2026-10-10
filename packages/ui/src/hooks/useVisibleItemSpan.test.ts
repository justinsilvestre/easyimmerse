import { renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  type ItemSpan,
  isSameSpan,
  spanOf,
  useVisibleItemSpan,
  visiblePositionsAfter,
} from "./useVisibleItemSpan.ts";

type Callback = (entries: Partial<IntersectionObserverEntry>[]) => void;

/** Installs an intersection observer that reports only what the test tells it to, and returns how to tell it. */
function installFakeObserver() {
  const observers: Callback[] = [];
  vi.stubGlobal(
    "IntersectionObserver",
    class {
      constructor(callback: Callback) {
        observers.push(callback);
      }
      observe() {}
      disconnect() {}
    },
  );
  return (targets: Element[], isIntersecting: boolean) =>
    observers.at(-1)?.(targets.map((target) => ({ target, isIntersecting })));
}

function listOf(count: number): HTMLElement {
  const list = document.createElement("ol");
  for (let index = 0; index < count; index++)
    list.append(document.createElement("li"));
  return list;
}

afterEach(() => vi.unstubAllGlobals());

describe("useVisibleItemSpan", () => {
  it("reports the span from the first to the last item in view", () => {
    const report = installFakeObserver();
    const list = listOf(5);
    const spans: (ItemSpan | null)[] = [];
    renderHook(() => useVisibleItemSpan(list, [], (span) => spans.push(span)));
    report([...list.children].slice(1, 4), true);
    expect(spans).toEqual([{ first: 1, last: 3 }]);
  });

  it("reports null once the list is gone", () => {
    installFakeObserver();
    const spans: (ItemSpan | null)[] = [];
    const { unmount } = renderHook(() =>
      useVisibleItemSpan(listOf(2), [], (span) => spans.push(span)),
    );
    unmount();
    expect(spans).toEqual([null]);
  });

  it("watches the items that `itemsOf` picks, at the positions `positionOf` gives", () => {
    const report = installFakeObserver();
    const list = listOf(3);
    list.children[2]?.setAttribute("data-place", "7");
    const spans: (ItemSpan | null)[] = [];
    renderHook(() =>
      useVisibleItemSpan(list, [], (span) => spans.push(span), {
        itemsOf: (root) => [...root.querySelectorAll("[data-place]")],
        positionOf: (item) => Number(item.getAttribute("data-place")),
      }),
    );
    report([list.children[2] as Element], true);
    expect(spans).toEqual([{ first: 7, last: 7 }]);
  });
});

describe("visiblePositionsAfter", () => {
  it("adds a position that came into view", () => {
    expect(
      visiblePositionsAfter(new Set([1]), [
        { position: 3, isIntersecting: true },
      ]),
    ).toEqual(new Set([1, 3]));
  });

  it("removes a position that left view", () => {
    expect(
      visiblePositionsAfter(new Set([1, 3]), [
        { position: 1, isIntersecting: false },
      ]),
    ).toEqual(new Set([3]));
  });

  it("applies the changes of a batch in order", () => {
    expect(
      visiblePositionsAfter(new Set(), [
        { position: 2, isIntersecting: true },
        { position: 2, isIntersecting: false },
      ]),
    ).toEqual(new Set());
  });
});

describe("spanOf", () => {
  it("runs from the smallest to the largest position", () => {
    expect(spanOf(new Set([4, 2, 7]))).toEqual({ first: 2, last: 7 });
  });

  it("returns null for no positions", () => {
    expect(spanOf(new Set())).toBeNull();
  });
});

describe("isSameSpan", () => {
  it("treats two nulls as the same", () => {
    expect(isSameSpan(null, null)).toBe(true);
  });

  it("treats spans with the same ends as the same", () => {
    expect(isSameSpan({ first: 1, last: 3 }, { first: 1, last: 3 })).toBe(true);
  });

  it("tells apart spans with different ends", () => {
    expect(isSameSpan({ first: 1, last: 3 }, { first: 1, last: 4 })).toBe(
      false,
    );
  });

  it("tells a span apart from null", () => {
    expect(isSameSpan({ first: 1, last: 3 }, null)).toBe(false);
  });
});
