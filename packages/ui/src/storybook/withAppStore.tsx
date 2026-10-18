import type { BackendClient } from "@easyimmerse/backend";
import { createApplyAppearance } from "@easyimmerse/effects-web";
import type {
  BrowserFileRegistry,
  Effects,
  ServerConfig,
  Theme,
} from "@easyimmerse/state";
import { actions, createRecordingEffects } from "@easyimmerse/state";
import type { Decorator } from "@storybook/react-vite";
import { type ReactNode, useEffect, useState } from "react";
import { browserFrameCapturer } from "../player/browserFrameCapturer.ts";
import { AppStoreProviders } from "../testSupport/AppStoreProviders.tsx";
import { createTestAppStore } from "../testSupport/createTestAppStore.ts";

/** Set under `parameters.appStore` to replace the fixture backend, to connect a browser file registry, or to keep preferences somewhere lasting. */
type AppStoreParameters = {
  client?: BackendClient;
  server?: ServerConfig;
  browserFileRegistry?: BrowserFileRegistry<File>;
  /** Where the store reads and writes its preferences, such as the reading place; in memory by default. */
  preferenceStorage?: Pick<Effects, "loadPreference" | "savePreference">;
};

/**
 * Renders a story inside a fresh app store with recording effects that apply the appearance to the page, a fake backend that answers with the fixture responses, and a player registry.
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
      {children}
    </AppStoreProviders>
  );
}

function createTestAppStoreFollowing(
  systemTheme: Theme,
  appStore: AppStoreParameters,
) {
  const effects = {
    ...createRecordingEffects(),
    ...appStore.preferenceStorage,
    applyAppearance: createApplyAppearance(document.documentElement),
  };
  const testAppStore = createTestAppStore(
    appStore.client,
    appStore.server,
    appStore.browserFileRegistry && {
      registry: appStore.browserFileRegistry,
      frameCapturer: browserFrameCapturer,
    },
    effects,
  );
  testAppStore.store.dispatch(actions.systemThemeChanged(systemTheme));
  return testAppStore;
}
