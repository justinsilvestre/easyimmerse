import { browser } from "wxt/browser";
import { defineBackground } from "wxt/utils/define-background";

/** Opens the side panel when the toolbar button is clicked. Firefox has no `sidePanel` API, so the call is guarded. */
export default defineBackground(() => {
  browser.sidePanel
    ?.setPanelBehavior?.({ openPanelOnActionClick: true })
    .catch(() => {});
});
