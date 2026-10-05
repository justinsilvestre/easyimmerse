import type { BrowserFileRegistry } from "@easyimmerse/state";
import type { ReactNode } from "react";
import { Provider } from "react-redux";
import { BrowserFileRegistryContext } from "../browserFileRegistryContext.ts";
import { WordClickMemoryProvider } from "../components/wordClickMemoryContext.tsx";
import { NoticesProvider } from "../notices/NoticesContext.tsx";
import type { NoticeStore } from "../notices/noticeStore.ts";
import { PlayerRegistryContext } from "../playerRegistryContext.ts";
import type { createTestAppStore } from "./createTestAppStore.ts";

type TestAppStore = ReturnType<typeof createTestAppStore>;

export function AppStoreProviders({
  store,
  playerRegistry,
  browserFileRegistry = null,
  noticeStore,
  children,
}: Pick<TestAppStore, "store" | "playerRegistry"> & {
  browserFileRegistry?: BrowserFileRegistry<File> | null;
  /** The store of the app's notices, for a test to read; a new one when left out. */
  noticeStore?: NoticeStore;
  children: ReactNode;
}) {
  return (
    <Provider store={store}>
      <PlayerRegistryContext value={playerRegistry}>
        <BrowserFileRegistryContext value={browserFileRegistry}>
          <NoticesProvider store={noticeStore}>
            <WordClickMemoryProvider>{children}</WordClickMemoryProvider>
          </NoticesProvider>
        </BrowserFileRegistryContext>
      </PlayerRegistryContext>
    </Provider>
  );
}
