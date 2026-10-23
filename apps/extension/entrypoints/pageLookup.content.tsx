import {
  createBackgroundLookUp,
  createI18nDetectLanguage,
} from "@easyimmerse/effects-extension";
import { mountPageLookup } from "@easyimmerse/ui/pageLookup";
import { browser } from "wxt/browser";
import { createShadowRootUi } from "wxt/utils/content-script-ui/shadow-root";
import { defineContentScript } from "wxt/utils/define-content-script";
import "@easyimmerse/ui/styles.css";

/** Keeps the pop-up above everything on the page. */
const hostCss =
  ":host { position: fixed !important; top: 0 !important; left: 0 !important; z-index: 2147483647 !important; }";

/** Looks up the words of web pages in the connected server's dictionaries, in a pop-up inside a shadow root that the page's styles do not reach. */
export default defineContentScript({
  matches: ["http://*/*", "https://*/*"],
  cssInjectionMode: "ui",
  async main(ctx) {
    const ui = await createShadowRootUi(ctx, {
      name: "easyimmerse-lookup",
      position: "inline",
      anchor: "body",
      css: hostCss,
      onMount: (container, _shadow, host) =>
        mountPageLookup({
          container,
          host,
          lookUp: createBackgroundLookUp((message) =>
            browser.runtime.sendMessage(message),
          ),
          detectLanguage: createI18nDetectLanguage((text) =>
            browser.i18n.detectLanguage(text),
          ),
        }),
      onRemove: (unmount) => unmount?.(),
    });
    ui.mount();
  },
});
