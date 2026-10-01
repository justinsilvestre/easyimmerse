import type { Decorator } from "@storybook/react-vite";
import { type ReactNode, useState } from "react";
import { AppStoreProviders } from "../testSupport/AppStoreProviders.tsx";
import { createTestAppStore } from "../testSupport/createTestAppStore.ts";

/** Renders a story inside a fresh app store with recording effects, a fake backend that answers with the fixture responses, and a player registry. */
export const withAppStore: Decorator = (Story) => (
  <StoryAppStore>
    <Story />
  </StoryAppStore>
);

function StoryAppStore({ children }: { children: ReactNode }) {
  const [{ store, playerRegistry }] = useState(() => createTestAppStore());
  return (
    <AppStoreProviders store={store} playerRegistry={playerRegistry}>
      {children}
    </AppStoreProviders>
  );
}
