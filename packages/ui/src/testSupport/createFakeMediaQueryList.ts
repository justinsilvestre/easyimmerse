/** A media query list whose match the test sets, and which reports how many change listeners it holds. */
export type FakeMediaQueryList = MediaQueryList & {
  changeMatch: (matches: boolean) => void;
  countListeners: () => number;
};

/** Builds a media query list that matches as given until a test changes it. */
export function createFakeMediaQueryList(matches: boolean): FakeMediaQueryList {
  const listeners = new Set<(event: MediaQueryListEvent) => void>();
  const list = {
    matches,
    media: "(prefers-color-scheme: dark)",
    addEventListener: (_type: string, listener: never) =>
      listeners.add(listener),
    removeEventListener: (_type: string, listener: never) =>
      listeners.delete(listener),
    changeMatch: (next: boolean) => {
      list.matches = next;
      for (const listener of listeners)
        listener({ matches: next } as MediaQueryListEvent);
    },
    countListeners: () => listeners.size,
  };
  return list as unknown as FakeMediaQueryList;
}
