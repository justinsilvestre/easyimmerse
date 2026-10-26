import type {
  EntryState,
  LocationEntry,
  LocationReport,
  LocationWrite,
} from "../route/routeEffect.ts";

type Listener = (report: LocationReport) => void;

type RecordedEntry = { path: string; state: EntryState | null };

/**
 * A history for tests that keeps its entries in memory and reports each change to its listeners at once, as a browser's history does:
 * each write as a write, and each return to an earlier entry, or address shown, as a move through the history.
 * Like a browser tab, it starts with one entry, at the home screen's path, which it reports only once an address is shown or written,
 * so that a store made over it starts where its route starts without a report.
 */
export function createRecordedHistory() {
  const listeners = new Set<Listener>();
  let entries: RecordedEntry[] = [{ path: "/", state: null }];
  let index = 0;
  let isShown = false;
  const report = (cause: LocationReport["cause"]) => {
    const entry = entries[index];
    if (entry === undefined) return;
    for (const listener of listeners) listener({ ...entry, cause });
  };
  const put = (entry: RecordedEntry, isNew: boolean) => {
    if (isNew) index += 1;
    entries = [...entries.slice(0, index), entry];
    isShown = true;
  };
  return {
    write: ({ path, state }: LocationEntry, write: LocationWrite) => {
      put({ path, state }, write === "push");
      report("write");
    },
    back: () => {
      if (index <= 0) return;
      index -= 1;
      report("traversal");
    },
    /** Shows the address in place of the current entry, as at startup or after the browser's Back or Forward, and reports it. */
    show: (path: string, state: EntryState | null) => {
      put({ path, state }, false);
      report("traversal");
    },
    subscribe: (listener: Listener) => {
      listeners.add(listener);
      const entry = entries[index];
      if (isShown && entry !== undefined)
        listener({ ...entry, cause: "traversal" });
      return () => listeners.delete(listener);
    },
  };
}
