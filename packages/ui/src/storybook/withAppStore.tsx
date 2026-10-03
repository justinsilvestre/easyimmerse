import type { Theme } from "@easyimmerse/state";
import { actions } from "@easyimmerse/state";
import type { Decorator } from "@storybook/react-vite";
import { type ReactNode, useEffect, useState } from "react";
import { useApplyTextScale } from "../hooks/useApplyTextScale.ts";
import { useApplyTheme } from "../hooks/useApplyTheme.ts";
import { AppStoreProviders } from "../testSupport/AppStoreProviders.tsx";
import { createTestAppStore } from "../testSupport/createTestAppStore.ts";

/**
 * Renders a story inside a fresh app store with recording effects, a fake backend that answers with the fixture responses, and a player registry.
 * The toolbar's theme stands in for the system theme, so the theme toggle in a story switches the page as it does in the app.
 */
export const withAppStore: Decorator = (Story, { globals }) => (
  <StoryAppStore systemTheme={globals.theme ?? "light"}>
    <Story />
  </StoryAppStore>
);

function StoryAppStore({
  systemTheme,
  children,
}: {
  systemTheme: Theme;
  children: ReactNode;
}) {
  const [{ store, playerRegistry }] = useState(() =>
    createTestAppStoreFollowing(systemTheme),
  );
  useEffect(() => {
    store.dispatch(actions.systemThemeChanged(systemTheme));
  }, [store, systemTheme]);
  return (
    <AppStoreProviders store={store} playerRegistry={playerRegistry}>
      <StoryThemeHandler />
      {children}
    </AppStoreProviders>
  );
}

function createTestAppStoreFollowing(systemTheme: Theme) {
  const testAppStore = createTestAppStore();
  testAppStore.store.dispatch(actions.systemThemeChanged(systemTheme));
  return testAppStore;
}

function StoryThemeHandler() {
  useApplyTheme();
  useApplyTextScale();
  return null;
}
