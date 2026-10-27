import { afterEach, describe, expect, it } from "vitest";
import {
  createSubscribeToLinkClicks,
  type LinkClickScope,
} from "./subscribeToLinkClicks.ts";

const stops: (() => void)[] = [];

afterEach(() => {
  for (const stop of stops.splice(0)) stop();
  document.body.innerHTML = "";
});

/** Adds a link with the given attributes, subscribes to link clicks, and returns the paths reported and the link. */
function linkIn(scope: LinkClickScope, attributes: Record<string, string>) {
  const link = document.createElement("a");
  link.append("Library");
  for (const [name, value] of Object.entries(attributes))
    link.setAttribute(name, value);
  document.body.append(link);
  const paths: string[] = [];
  stops.push(
    createSubscribeToLinkClicks(document, scope)((path) => paths.push(path)),
  );
  return { link, paths };
}

/**
 * Clicks the link and returns whether the click was left to the platform.
 * The click starts at the link itself, since happy-dom follows a link as soon as a click bubbles out of it, before the document hears it.
 */
function click(link: HTMLAnchorElement, init: MouseEventInit = {}) {
  const event = new MouseEvent(init.button === 1 ? "auxclick" : "click", {
    bubbles: true,
    cancelable: true,
    ...init,
  });
  link.dispatchEvent(event);
  return !event.defaultPrevented;
}

describe("createSubscribeToLinkClicks", () => {
  describe("for plain clicks only", () => {
    it("reports the path and query of a plain click on the app's own link", () => {
      const { link, paths } = linkIn("plain", {
        href: "/projects/p1?settings=general",
      });
      click(link);
      expect(paths).toEqual(["/projects/p1?settings=general"]);
    });

    it("keeps the browser from loading a link it reports", () => {
      const { link } = linkIn("plain", { href: "/library" });
      expect(click(link)).toBe(false);
    });

    it("leaves a click with a modifier key to the browser", () => {
      const { link, paths } = linkIn("plain", { href: "/library" });
      click(link, { metaKey: true });
      expect(paths).toEqual([]);
    });

    it("leaves a Ctrl-click to the browser", () => {
      const { link } = linkIn("plain", { href: "/library" });
      expect(click(link, { ctrlKey: true })).toBe(true);
    });

    it("leaves a middle click to the browser", () => {
      const { link } = linkIn("plain", { href: "/library" });
      expect(click(link, { button: 1 })).toBe(true);
    });

    it("leaves a link with a target to the browser", () => {
      const { link, paths } = linkIn("plain", {
        href: "/library",
        target: "_blank",
      });
      click(link);
      expect(paths).toEqual([]);
    });

    it("leaves a download link to the browser", () => {
      const { link, paths } = linkIn("plain", {
        href: "/export.apkg",
        download: "",
      });
      click(link);
      expect(paths).toEqual([]);
    });

    it("leaves a link to another origin to the browser", () => {
      const { link, paths } = linkIn("plain", {
        href: "https://elsewhere.example/library",
      });
      click(link);
      expect(paths).toEqual([]);
    });

    it("stops reporting once stopped", () => {
      const { link, paths } = linkIn("plain", { href: "/library" });
      for (const stop of stops.splice(0)) stop();
      click(link);
      expect(paths).toEqual([]);
    });
  });

  describe("for every click", () => {
    it("reports a click with a modifier key", () => {
      const { link, paths } = linkIn("every", { href: "/library" });
      click(link, { metaKey: true });
      expect(paths).toEqual(["/library"]);
    });

    it("reports a middle click", () => {
      const { link, paths } = linkIn("every", { href: "/library" });
      click(link, { button: 1 });
      expect(paths).toEqual(["/library"]);
    });
  });
});
