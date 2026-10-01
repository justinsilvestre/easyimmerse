import type { Action } from "redux";
import type { EnhancerComposer } from "../createAppStore.ts";
import { sanitizeForDevTools } from "./sanitizeForDevTools.ts";

/** The options this app gives the Redux DevTools browser extension. */
export type DevToolsOptions = {
  actionSanitizer: (action: Action) => Action;
  stateSanitizer: (state: unknown) => unknown;
};

/** The function the Redux DevTools browser extension installs as `__REDUX_DEVTOOLS_EXTENSION_COMPOSE__`. */
export type DevToolsExtensionCompose = (
  options: DevToolsOptions,
) => EnhancerComposer;

/**
 * Builds an enhancer composer that connects the store to the Redux DevTools browser extension.
 * Binary data such as picked dictionary files is shown as a short placeholder, so that the extension stays responsive.
 */
export function createDevToolsComposer(
  extensionCompose: DevToolsExtensionCompose,
): EnhancerComposer {
  return extensionCompose({
    // The sanitized action keeps its type, so it is still an action.
    actionSanitizer: (action) => sanitizeForDevTools(action) as Action,
    stateSanitizer: sanitizeForDevTools,
  });
}
