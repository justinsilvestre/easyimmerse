import type { Theme } from "@easyimmerse/state";
import { actions } from "@easyimmerse/state";
import type { Decorator } from "@storybook/react-vite";
import { type ReactNode, useEffect, useState } from "react";
import { useApplyTheme } from "../hooks/useApplyTheme.ts";
import { AppStoreProviders } from "../testSupport/AppStoreProviders.tsx";
import { createStoryAppStore } from "./createStoryAppStore.ts";

/**
 * Renders a story inside a fresh app store with a fake backend that answers with the fixture responses, and a player registry.
 * Player effects act on the mounted player; every other effect is only recorded.
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
    createStoryAppStoreFollowing(systemTheme),
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

function createStoryAppStoreFollowing(systemTheme: Theme) {
  const storyAppStore = createStoryAppStore();
  storyAppStore.store.dispatch(actions.systemThemeChanged(systemTheme));
  return storyAppStore;
}

function StoryThemeHandler() {
  useApplyTheme();
  return null;
}
