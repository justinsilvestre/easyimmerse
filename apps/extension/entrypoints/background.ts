import { resolveServerConfig } from "@easyimmerse/backend";
import {
  createLookUpTextListener,
  readMirroredServerConfig,
} from "@easyimmerse/effects-extension";
import { browser } from "wxt/browser";
import { defineBackground } from "wxt/utils/define-background";

/**
 * Opens the side panel when the toolbar button is clicked, and answers the lookups of the content script on web pages.
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
});

/** The server the build names, or else the one the side panel last connected to. */
async function findServer() {
  return (
    resolveServerConfig(import.meta.env, null) ??
    readMirroredServerConfig(browser.storage.local)
  );
}
