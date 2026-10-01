import type { BackendClient } from "@easyimmerse/backend";
import { render } from "@testing-library/react";
import type { ReactNode } from "react";
import { AppStoreProviders } from "./AppStoreProviders.tsx";
import { createTestAppStore } from "./createTestAppStore.ts";

/** Builds a fresh store, recording effects, and fake backend, then renders the element inside them. */
export function renderWithAppStore(element: ReactNode, client?: BackendClient) {
  const { effects, store, playerRegistry } = createTestAppStore(client);
  render(
    <AppStoreProviders store={store} playerRegistry={playerRegistry}>
      {element}
    </AppStoreProviders>,
  );
  return { effects, store, playerRegistry };
}
