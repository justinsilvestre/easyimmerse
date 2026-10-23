import { resolveServerConfig } from "@easyimmerse/backend";
import {
  createDictionaryMediaListener,
  createLookUpTextListener,
  rasterizeSvg,
  readMirroredServerConfig,
} from "@easyimmerse/effects-extension";
import { browser } from "wxt/browser";
import { defineBackground } from "wxt/utils/define-background";

/**
 * Opens the side panel when the toolbar button is clicked, and answers the lookups and the requests for dictionary images of the content script on web pages.
 * Firefox has no `sidePanel` API, nor a way to keep storage from content scripts, so those calls are guarded.
 */
export default defineBackground(() => {
  browser.sidePanel
    ?.setPanelBehavior?.({ openPanelOnActionClick: true })
    .catch(() => {});
  // The mirrored server includes its token, which content scripts have no need to read.
  browser.storage.local
    .setAccessLevel?.({ accessLevel: "TRUSTED_CONTEXTS" })
    .catch(() => {});
  browser.runtime.onMessage.addListener(createLookUpTextListener(findServer));
  // Firefox runs this script in a page, which can draw an SVG image that a content script there may not load under a strict page CSP.
  // Chrome runs it in a service worker, which cannot draw one, but its content scripts can.
  const canDrawSvg = typeof document !== "undefined";
  browser.runtime.onMessage.addListener(
    createDictionaryMediaListener(
      findServer,
      undefined,
      canDrawSvg ? rasterizeSvg : undefined,
    ),
  );
});

/** The server the build names, or else the one the side panel last connected to. */
async function findServer() {
  return (
    resolveServerConfig(import.meta.env, null) ??
    readMirroredServerConfig(browser.storage.local)
  );
}
