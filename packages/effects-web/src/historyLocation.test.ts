import type { LocationReport } from "@easyimmerse/state";
import { createMemoryHistory } from "@tanstack/history";
import { describe, expect, it } from "vitest";
import { createHistoryLocation } from "./historyLocation.ts";

const state = { previousPath: "/", origin: "app" } as const;

/** Subscribes to a history that starts at the path, and returns the reports. */
function subscribedAt(path: string) {
  const history = createMemoryHistory({ initialEntries: [path] });
  const location = createHistoryLocation(history);
  const reports: LocationReport[] = [];
  const stop = location.subscribeToLocation((report) => reports.push(report));
  return { history, location, reports, stop };
}

describe("createHistoryLocation", () => {
  it("reports the history's location once at once", () => {
    expect(subscribedAt("/projects/p1?settings=general").reports).toEqual([
      {
        path: "/projects/p1?settings=general",
        state: null,
        cause: "traversal",
      },
    ]);
  });

  it("reports a pushed entry at once, with the state kept with it", () => {
    const { location, reports } = subscribedAt("/");
    location.writeLocation({ path: "/library", state }, "push");
    expect(reports.at(-1)).toEqual({
      path: "/library",
      state,
      cause: "write",
    });
  });

  it("writes a replacing entry in place of the current one", () => {
    const { history, location } = subscribedAt("/elsewhere");
    location.writeLocation({ path: "/", state }, "replace");
    expect(history.length).toBe(1);
  });

  it("reports the previous entry as a move through the history once it returns to it", () => {
    const { location, reports } = subscribedAt("/");
    location.writeLocation({ path: "/library", state }, "push");
    location.returnToPreviousLocation();
    expect(reports.at(-1)).toEqual({
      path: "/",
      state: null,
      cause: "traversal",
    });
  });

  it("reports the entry that Forward returns to, with the state kept with it", () => {
    const { history, location, reports } = subscribedAt("/");
    location.writeLocation({ path: "/library", state }, "push");
    history.back();
    history.forward();
    expect(reports.at(-1)).toEqual({
      path: "/library",
      state,
      cause: "traversal",
    });
  });

  it("stops reporting once stopped", () => {
    const { location, reports, stop } = subscribedAt("/");
    stop();
    location.writeLocation({ path: "/library", state }, "push");
    expect(reports).toHaveLength(1);
  });
});
