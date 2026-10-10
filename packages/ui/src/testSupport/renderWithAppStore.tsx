import type { BackendClient } from "@easyimmerse/backend";
import type { BrowserFileRegistry, ServerConfig } from "@easyimmerse/state";
import { createRecordingEffects } from "@easyimmerse/state";
import { render } from "@testing-library/react";
import type { ReactNode } from "react";
import { AppStoreProviders } from "./AppStoreProviders.tsx";
import { createTestAppStore } from "./createTestAppStore.ts";

export type RenderOptions = {
  server?: ServerConfig;
  browserFileRegistry?: BrowserFileRegistry<File>;
  /** Values the device's preference store holds before the element renders. */
  storedPreferences?: Record<string, string>;
  /** Keeps the store's startup preference load waiting until the test calls `effects.releasePreferenceLoads`. */
  holdsPreferenceLoads?: boolean;
};

/** Builds a fresh store, recording effects, and fake backend, then renders the element inside them. */
export function renderWithAppStore(
  element: ReactNode,
  client?: BackendClient,
  options: RenderOptions = {},
) {
  const browserFileRegistry = options.browserFileRegistry ?? null;
  const { effects, store, playerRegistry } = createTestAppStore(
    client,
    options.server ?? null,
    browserFileRegistry,
    createRecordingEffects(
      options.storedPreferences,
      options.holdsPreferenceLoads,
    ),
  );
  render(
    <AppStoreProviders
      store={store}
      playerRegistry={playerRegistry}
      browserFileRegistry={browserFileRegistry}
    >
      {element}
    </AppStoreProviders>,
  );
  return { effects, store, playerRegistry };
}
