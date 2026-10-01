import type { ReactNode } from "react";
import { Provider } from "react-redux";
import { PlayerRegistryContext } from "../playerRegistryContext.ts";
import type { createTestAppStore } from "./createTestAppStore.ts";

type TestAppStore = ReturnType<typeof createTestAppStore>;

export function AppStoreProviders({
  store,
  playerRegistry,
  children,
}: Pick<TestAppStore, "store" | "playerRegistry"> & { children: ReactNode }) {
  return (
    <Provider store={store}>
      <PlayerRegistryContext value={playerRegistry}>
        {children}
      </PlayerRegistryContext>
    </Provider>
  );
}
