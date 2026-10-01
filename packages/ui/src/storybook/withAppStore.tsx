import type { Decorator } from "@storybook/react-vite";
import { type ReactNode, useState } from "react";
import { AppStoreProviders } from "../testSupport/AppStoreProviders.tsx";
import { createStoryAppStore } from "./createStoryAppStore.ts";

/**
 * Renders a story inside a fresh app store with a fake backend that answers with the fixture responses, and a player registry.
 * Player effects act on the mounted player; every other effect is only recorded.
 */
export const withAppStore: Decorator = (Story) => (
  <StoryAppStore>
    <Story />
  </StoryAppStore>
);

function StoryAppStore({ children }: { children: ReactNode }) {
  const [{ store, playerRegistry }] = useState(createStoryAppStore);
  return (
    <AppStoreProviders store={store} playerRegistry={playerRegistry}>
      {children}
    </AppStoreProviders>
  );
}
