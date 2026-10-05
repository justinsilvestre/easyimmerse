import type { BrowserFileRegistry } from "@easyimmerse/state";
import type { ReactNode } from "react";
import { Provider } from "react-redux";
import { BrowserFileRegistryContext } from "../browserFileRegistryContext.ts";
import { WordClickMemoryProvider } from "../components/wordClickMemoryContext.tsx";
import { SharedSavingProvider } from "../flashcards/SharedSavingContext.tsx";
import type { SharedSaving } from "../flashcards/sharedSaving.ts";
import { UnsavedCardsStatus } from "../flashcards/unsaved/UnsavedCardsStatus.tsx";
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
  sharedSaving,
  children,
}: Pick<TestAppStore, "store" | "playerRegistry"> & {
  browserFileRegistry?: BrowserFileRegistry<File> | null;
  /** The store of the app's notices, for a test to read; a new one when left out. */
  noticeStore?: NoticeStore;
  /** The app's shared flashcard-saving parts, such as the list of flashcards that could not be saved, for a test to read; new ones when left out. */
  sharedSaving?: SharedSaving;
  children: ReactNode;
}) {
  return (
    <Provider store={store}>
      <PlayerRegistryContext value={playerRegistry}>
        <BrowserFileRegistryContext value={browserFileRegistry}>
          <SharedSavingProvider shared={sharedSaving}>
            <NoticesProvider
              store={noticeStore}
              statusLine={<UnsavedCardsStatus />}
            >
              <WordClickMemoryProvider>{children}</WordClickMemoryProvider>
            </NoticesProvider>
          </SharedSavingProvider>
        </BrowserFileRegistryContext>
      </PlayerRegistryContext>
    </Provider>
  );
}
