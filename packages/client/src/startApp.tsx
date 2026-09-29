import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App.tsx";
import type { Platform } from "./state/AppState.ts";
import { appActions } from "./state/appActions.ts";
import { createAppStore } from "./state/createAppStore.ts";
import type { EffectsRunners } from "./state/effects.ts";

/**
 * Starts the app inside the page element with the ID `root`.
 *
 * @param effectsRunners The functions carrying out side effects on the given platform.
 */
export function startApp(platform: Platform, effectsRunners: EffectsRunners) {
  const store = createAppStore(platform, effectsRunners);
  store.dispatch(appActions.appStarted());
  const rootElement = document.getElementById("root") as HTMLElement;
  createRoot(rootElement).render(
    <StrictMode>
      <App store={store} />
    </StrictMode>,
  );
}
