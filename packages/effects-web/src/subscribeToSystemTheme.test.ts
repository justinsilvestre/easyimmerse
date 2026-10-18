import type { Theme } from "@easyimmerse/state";
import { describe, expect, it } from "vitest";
import { createSubscribeToSystemTheme } from "./subscribeToSystemTheme.ts";

/** A media query whose match the test sets, standing in for `prefers-color-scheme: dark`. */
function createDarkQuery(matches: boolean) {
  const target = new EventTarget();
  const query = Object.assign(target, { matches });
  const change = (prefersDark: boolean) => {
    query.matches = prefersDark;
    target.dispatchEvent(new Event("change"));
  };
  return { query: query as unknown as MediaQueryList, change };
}

/** Subscribes to a query that starts dark and returns the themes reported. */
function subscribed() {
  const { query, change } = createDarkQuery(true);
  const themes: Theme[] = [];
  const stop = createSubscribeToSystemTheme(query)((theme) =>
    themes.push(theme),
  );
  return { themes, change, stop };
}

describe("createSubscribeToSystemTheme", () => {
  it("reports the system theme at once", () => {
    expect(subscribed().themes).toEqual(["dark"]);
  });

  it("reports the system theme when it changes", () => {
    const { themes, change } = subscribed();
    change(false);
    expect(themes).toEqual(["dark", "light"]);
  });

  it("stops reporting once stopped", () => {
    const { themes, change, stop } = subscribed();
    stop();
    change(false);
    expect(themes).toEqual(["dark"]);
  });
});
