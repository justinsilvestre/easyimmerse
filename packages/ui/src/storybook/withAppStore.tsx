import { backendStoreParts, configureBackend } from "@easyimmerse/backend";
import {
  createAppStore,
  createPlayerRegistry,
  createRecordingEffects,
} from "@easyimmerse/state";
import type { Decorator } from "@storybook/react-vite";
import { type ReactNode, useState } from "react";
import { Provider } from "react-redux";
import { PlayerRegistryContext } from "../playerRegistryContext.ts";
import { createFakeBackendClient } from "../testSupport/createFakeBackendClient.ts";
import { fixtureResponses } from "../testSupport/fixtureResponses.ts";

/** Renders a story inside a fresh app store with recording effects, a fake backend that answers with the fixture responses, and a player registry. */
export const withAppStore: Decorator = (Story) => (
  <AppStoreProvider>
    <Story />
  </AppStoreProvider>
);

function AppStoreProvider({ children }: { children: ReactNode }) {
  const [{ store, playerRegistry }] = useState(createStoryContext);
  return (
    <Provider store={store}>
      <PlayerRegistryContext value={playerRegistry}>
        {children}
      </PlayerRegistryContext>
    </Provider>
  );
}

function createStoryContext() {
  configureBackend(createFakeBackendClient(fixtureResponses));
  const store = createAppStore(createRecordingEffects(), backendStoreParts);
  return { store, playerRegistry: createPlayerRegistry() };
}
