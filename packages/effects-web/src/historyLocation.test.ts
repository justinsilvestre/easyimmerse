import type { LocationEntry } from "@easyimmerse/state";
import { describe, expect, it } from "vitest";
import { createHistoryLocation } from "./historyLocation.ts";

type FakeEntry = { href: string; state: unknown };

/** A page at the address, whose history entries the test can see and whose Back the test can press. */
function pageAt(address: string, state: unknown = null) {
  const events = new EventTarget();
  const url = new URL(address);
  const entries: FakeEntry[] = [{ href: url.href, state }];
  const current = () => entries.at(-1) ?? { href: url.href, state: null };
  const moveTo = (path: string, entryState: unknown, replaces: boolean) => {
    url.href = new URL(path, url).href;
    if (replaces) entries.pop();
    entries.push({ href: url.href, state: entryState });
  };
  const goBack = () => {
    entries.pop();
    url.href = current().href;
    events.dispatchEvent(new Event("popstate"));
  };
  const page = {
    location: url as unknown as Location,
    history: {
      get state() {
        return current().state;
      },
      pushState: (entryState: unknown, _unused: string, path: string) =>
        moveTo(path, entryState, false),
      replaceState: (entryState: unknown, _unused: string, path: string) =>
        moveTo(path, entryState, true),
      back: goBack,
    } as unknown as History,
    addEventListener: events.addEventListener.bind(events),
    removeEventListener: events.removeEventListener.bind(events),
  };
  return { location: createHistoryLocation(page), entries, goBack };
}

/** Subscribes to a page at the address and returns the entries reported. */
function subscribedAt(address: string, state: unknown = null) {
  const page = pageAt(address, state);
  const reported: LocationEntry[] = [];
  const stop = page.location.subscribeToLocation((entry) =>
    reported.push(entry),
  );
  return { ...page, reported, stop };
}

const library = { path: "/library", previousPath: "/" };

describe("createHistoryLocation", () => {
  it("reports the page's path and query at once", () => {
    expect(
      subscribedAt("https://app.example.com/projects/p1?settings=general#top")
        .reported,
    ).toEqual([{ path: "/projects/p1?settings=general", previousPath: null }]);
  });

  it("reports the previous path kept with the entry, as after a reload", () => {
    expect(
      subscribedAt("https://app.example.com/library", { previousPath: "/" })
        .reported,
    ).toEqual([library]);
  });

  it("reports the entry that Back returns to", () => {
    const page = subscribedAt("https://app.example.com/");
    page.location.writeLocation(library, "push");
    page.goBack();
    expect(page.reported.at(-1)).toEqual({ path: "/", previousPath: null });
  });

  it("returns to the previous entry", () => {
    const page = subscribedAt("https://app.example.com/");
    page.location.writeLocation(library, "push");
    page.location.returnToPreviousLocation();
    expect(page.entries.map(({ href }) => href)).toEqual([
      "https://app.example.com/",
    ]);
  });

  it("stops reporting once stopped", () => {
    const page = subscribedAt("https://app.example.com/");
    page.location.writeLocation(library, "push");
    page.stop();
    page.goBack();
    expect(page.reported).toHaveLength(1);
  });

  it("adds a history entry for a pushed address, keeping its previous path", () => {
    const page = pageAt("https://app.example.com/");
    page.location.writeLocation(library, "push");
    expect(page.entries).toEqual([
      { href: "https://app.example.com/", state: null },
      { href: "https://app.example.com/library", state: { previousPath: "/" } },
    ]);
  });

  it("writes a replacing address in place of the current entry", () => {
    const page = pageAt("https://app.example.com/elsewhere");
    page.location.writeLocation({ path: "/", previousPath: null }, "replace");
    expect(page.entries).toEqual([
      { href: "https://app.example.com/", state: { previousPath: null } },
    ]);
  });
});
