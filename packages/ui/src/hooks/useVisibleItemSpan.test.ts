import { renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { type ItemSpan, useVisibleItemSpan } from "./useVisibleItemSpan.ts";

type Callback = (entries: Partial<IntersectionObserverEntry>[]) => void;

/** The options each fake intersection observer was created with. */
const observerOptions: (IntersectionObserverInit | undefined)[] = [];

/** Installs an intersection observer that reports only what the test tells it to, and returns how to tell it. */
function installFakeObserver() {
  const observers: Callback[] = [];
  vi.stubGlobal(
    "IntersectionObserver",
    class {
      constructor(callback: Callback, options?: IntersectionObserverInit) {
        observers.push(callback);
        observerOptions.push(options);
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

  it("reports nothing when the span in view stays the same", () => {
    const report = installFakeObserver();
    const list = listOf(5);
    const spans: (ItemSpan | null)[] = [];
    renderHook(() => useVisibleItemSpan(list, [], (span) => spans.push(span)));
    const [first, second, third] = [...list.children] as Element[];
    report([first as Element, third as Element], true);
    report([second as Element], true);
    expect(spans).toHaveLength(1);
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

  it("counts items within the margin around the list as in view", () => {
    installFakeObserver();
    renderHook(() =>
      useVisibleItemSpan(listOf(1), [], () => undefined, {
        rootMargin: "100% 0px",
      }),
    );
    expect(observerOptions.at(-1)?.rootMargin).toBe("100% 0px");
  });
});
