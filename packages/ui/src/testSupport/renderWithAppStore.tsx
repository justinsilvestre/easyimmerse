import type { BackendClient, ServerConfig } from "@easyimmerse/backend";
import type { BrowserFileRegistry } from "@easyimmerse/state";
import { render } from "@testing-library/react";
import type { ReactNode } from "react";
import { AppStoreProviders } from "./AppStoreProviders.tsx";
import { createTestAppStore } from "./createTestAppStore.ts";

export type RenderOptions = {
  server?: ServerConfig;
  browserFileRegistry?: BrowserFileRegistry<File>;
};

/** Builds a fresh store, recording effects, and fake backend, then renders the element inside them. */
export function renderWithAppStore(
  element: ReactNode,
  client?: BackendClient,
  options: RenderOptions = {},
) {
  const { effects, store, playerRegistry } = createTestAppStore(
    client,
    options.server ?? null,
  );
  render(
    <AppStoreProviders
      store={store}
      playerRegistry={playerRegistry}
      browserFileRegistry={options.browserFileRegistry ?? null}
    >
      {element}
    </AppStoreProviders>,
  );
  return { effects, store, playerRegistry };
}
