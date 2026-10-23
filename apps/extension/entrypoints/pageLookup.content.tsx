import {
  createBackgroundLookUp,
  createBackgroundMediaFetch,
  createI18nDetectLanguage,
} from "@easyimmerse/effects-extension";
import { mountPageLookup, pageLookupHostCss } from "@easyimmerse/ui/pageLookup";
import { browser } from "wxt/browser";
import { createShadowRootUi } from "wxt/utils/content-script-ui/shadow-root";
import { defineContentScript } from "wxt/utils/define-content-script";
import "@easyimmerse/ui/styles.css";

const sendMessage = (message: unknown) => browser.runtime.sendMessage(message);

/** Looks up the words of web pages in the connected server's dictionaries, in a pop-up inside a shadow root that the page's styles do not reach. */
export default defineContentScript({
  matches: ["http://*/*", "https://*/*"],
  cssInjectionMode: "ui",
  async main(ctx) {
    const ui = await createShadowRootUi(ctx, {
      name: "easyimmerse-lookup",
      position: "inline",
      anchor: "body",
      css: pageLookupHostCss,
      onMount: (container, _shadow, host) =>
        mountPageLookup({
          container,
          host,
          lookUp: createBackgroundLookUp(sendMessage),
          fetchMedia: createBackgroundMediaFetch(sendMessage),
          detectLanguage: createI18nDetectLanguage((text) =>
            browser.i18n.detectLanguage(text),
          ),
        }),
      onRemove: (unmount) => unmount?.(),
    });
    ui.mount();
  },
});
