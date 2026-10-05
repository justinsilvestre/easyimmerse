import type { BrowserFileRegistry } from "@easyimmerse/state";
import type { ReactNode } from "react";
import { Provider } from "react-redux";
import { BrowserFileRegistryContext } from "../browserFileRegistryContext.ts";
import { WordClickMemoryProvider } from "../components/wordClickMemoryContext.tsx";
import { PlayerRegistryContext } from "../playerRegistryContext.ts";
import type { createTestAppStore } from "./createTestAppStore.ts";

type TestAppStore = ReturnType<typeof createTestAppStore>;

export function AppStoreProviders({
  store,
  playerRegistry,
  browserFileRegistry = null,
  children,
}: Pick<TestAppStore, "store" | "playerRegistry"> & {
  browserFileRegistry?: BrowserFileRegistry<File> | null;
  children: ReactNode;
}) {
  return (
    <Provider store={store}>
      <PlayerRegistryContext value={playerRegistry}>
        <BrowserFileRegistryContext value={browserFileRegistry}>
          <WordClickMemoryProvider>{children}</WordClickMemoryProvider>
        </BrowserFileRegistryContext>
      </PlayerRegistryContext>
    </Provider>
  );
}
