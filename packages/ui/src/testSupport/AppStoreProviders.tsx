import type { BrowserFileRegistry } from "@easyimmerse/state";
import type { ReactNode } from "react";
import { Provider } from "react-redux";
import { BrowserFileRegistryContext } from "../browserFileRegistryContext.ts";
import { WordClickMemoryProvider } from "../components/wordClickMemoryContext.tsx";
import { UnsavedCardsProvider } from "../flashcards/unsaved/UnsavedCardsContext.tsx";
import { UnsavedCardsStatus } from "../flashcards/unsaved/UnsavedCardsStatus.tsx";
import type { UnsavedCardStore } from "../flashcards/unsaved/unsavedCardStore.ts";
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
  unsavedCardStore,
  children,
}: Pick<TestAppStore, "store" | "playerRegistry"> & {
  browserFileRegistry?: BrowserFileRegistry<File> | null;
  /** The store of the app's notices, for a test to read; a new one when left out. */
  noticeStore?: NoticeStore;
  /** The list of flashcards that could not be saved, for a test to read; a new one when left out. */
  unsavedCardStore?: UnsavedCardStore;
  children: ReactNode;
}) {
  return (
    <Provider store={store}>
      <PlayerRegistryContext value={playerRegistry}>
        <BrowserFileRegistryContext value={browserFileRegistry}>
          <UnsavedCardsProvider store={unsavedCardStore}>
            <NoticesProvider
              store={noticeStore}
              statusLine={<UnsavedCardsStatus />}
            >
              <WordClickMemoryProvider>{children}</WordClickMemoryProvider>
            </NoticesProvider>
          </UnsavedCardsProvider>
        </BrowserFileRegistryContext>
      </PlayerRegistryContext>
    </Provider>
  );
}
