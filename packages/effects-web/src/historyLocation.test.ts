import { describe, expect, it } from "vitest";
import { createHistoryLocation } from "./historyLocation.ts";

/** A page at the address, whose history entries the test can see and whose Back the test can press. */
function pageAt(address: string) {
  const events = new EventTarget();
  const url = new URL(address);
  const entries = [url.href];
  const moveTo = (path: string, replaces: boolean) => {
    url.href = new URL(path, url).href;
    if (replaces) entries.pop();
    entries.push(url.href);
  };
  const page = {
    location: url as unknown as Location,
    history: {
      pushState: (_state: unknown, _unused: string, path: string) =>
        moveTo(path, false),
      replaceState: (_state: unknown, _unused: string, path: string) =>
        moveTo(path, true),
    } as unknown as History,
    addEventListener: events.addEventListener.bind(events),
    removeEventListener: events.removeEventListener.bind(events),
  };
  const goBack = () => {
    entries.pop();
    url.href = entries.at(-1) ?? url.href;
    events.dispatchEvent(new Event("popstate"));
  };
  return { location: createHistoryLocation(page), entries, goBack };
}

/** Subscribes to a page at the address and returns the addresses reported. */
function subscribedAt(address: string) {
  const page = pageAt(address);
  const paths: string[] = [];
  const stop = page.location.subscribeToLocation((path) => paths.push(path));
  return { ...page, paths, stop };
}

describe("createHistoryLocation", () => {
  it("reports the page's path and query at once", () => {
    expect(
      subscribedAt("https://app.example.com/projects/p1?settings=general#top")
        .paths,
    ).toEqual(["/projects/p1?settings=general"]);
  });

  it("reports the address that Back returns to", () => {
    const page = subscribedAt("https://app.example.com/");
    page.location.writeLocation("/library", "push");
    page.goBack();
    expect(page.paths).toEqual(["/", "/"]);
  });

  it("stops reporting once stopped", () => {
    const page = subscribedAt("https://app.example.com/");
    page.location.writeLocation("/library", "push");
    page.stop();
    page.goBack();
    expect(page.paths).toEqual(["/"]);
  });

  it("adds a history entry for a pushed address", () => {
    const page = pageAt("https://app.example.com/");
    page.location.writeLocation("/library", "push");
    expect(page.entries).toEqual([
      "https://app.example.com/",
      "https://app.example.com/library",
    ]);
  });

  it("writes a replacing address in place of the current entry", () => {
    const page = pageAt("https://app.example.com/elsewhere");
    page.location.writeLocation("/", "replace");
    expect(page.entries).toEqual(["https://app.example.com/"]);
  });
});
