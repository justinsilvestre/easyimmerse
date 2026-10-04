import type { BackendClient, ServerConfig } from "@easyimmerse/backend";
import type { BrowserFileRegistry, Theme } from "@easyimmerse/state";
import { actions } from "@easyimmerse/state";
import type { Decorator } from "@storybook/react-vite";
import { type ReactNode, useEffect, useState } from "react";
import { useApplyTheme } from "../hooks/useApplyTheme.ts";
import { AppStoreProviders } from "../testSupport/AppStoreProviders.tsx";
import { createTestAppStore } from "../testSupport/createTestAppStore.ts";

/** Set under `parameters.appStore` to replace the fixture backend or to connect a browser file registry. */
export type AppStoreParameters = {
  client?: BackendClient;
  server?: ServerConfig;
  browserFileRegistry?: BrowserFileRegistry<File>;
};

/**
 * Renders a story inside a fresh app store with recording effects, a fake backend that answers with the fixture responses, and a player registry.
 * The stored preferences load as they do when the app starts.
 * The toolbar's theme stands in for the system theme, so the theme toggle in a story switches the page as it does in the app.
 */
export const withAppStore: Decorator = (Story, { globals, parameters }) => (
  <StoryAppStore
    systemTheme={globals.theme ?? "light"}
    appStore={parameters.appStore ?? {}}
  >
    <Story />
  </StoryAppStore>
);

function StoryAppStore({
  systemTheme,
  appStore,
  children,
}: {
  systemTheme: Theme;
  appStore: AppStoreParameters;
  children: ReactNode;
}) {
  const [{ store, playerRegistry }] = useState(() =>
    createTestAppStoreFollowing(systemTheme, appStore),
  );
  useEffect(() => {
    store.dispatch(actions.systemThemeChanged(systemTheme));
  }, [store, systemTheme]);
  return (
    <AppStoreProviders
      store={store}
      playerRegistry={playerRegistry}
      browserFileRegistry={appStore.browserFileRegistry ?? null}
    >
      <StoryThemeHandler />
      {children}
    </AppStoreProviders>
  );
}

function createTestAppStoreFollowing(
  systemTheme: Theme,
  appStore: AppStoreParameters,
) {
  const testAppStore = createTestAppStore(appStore.client, appStore.server);
  testAppStore.store.dispatch(actions.systemThemeChanged(systemTheme));
  testAppStore.store.dispatch(actions.preferencesLoadRequested());
  return testAppStore;
}

function StoryThemeHandler() {
  useApplyTheme();
  return null;
}
