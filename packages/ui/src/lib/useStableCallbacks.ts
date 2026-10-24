import { useRef, useState } from "react";

// biome-ignore lint/suspicious/noExplicitAny: any function, whatever it takes.
type Callback = (...args: any[]) => unknown;

/**
 * Returns functions that keep their identity for as long as the component lives and call the latest of the given callbacks,
 * so that a memoised component receiving them does not render again when only the callbacks have changed.
 * The set of names must stay the same; a callback missing at a later render is skipped.
 */
export function useStableCallbacks<T extends Record<string, Callback>>(
  callbacks: T,
): T {
  const latest = useRef(callbacks);
  latest.current = callbacks;
  const [stable] = useState(() => {
    const entries = Object.keys(callbacks).map((name) => [
      name,
      (...args: unknown[]) => latest.current[name]?.(...args),
    ]);
    return Object.fromEntries(entries) as T;
  });
  return stable;
}
