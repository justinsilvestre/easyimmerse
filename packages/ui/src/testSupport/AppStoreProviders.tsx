import type { BrowserFileRegistry } from "@easyimmerse/state";
import type { ReactNode } from "react";
import { Provider } from "react-redux";
import { BrowserFileRegistryContext } from "../browserFileRegistryContext.ts";
import { WordClickMemoryProvider } from "../components/wordClickMemoryContext.tsx";
import { SharedSavingProvider } from "../flashcards/SharedSavingContext.tsx";
import type { SharedSaving } from "../flashcards/sharedSaving.ts";
import { UnsavedCardsStatus } from "../flashcards/unsaved/UnsavedCardsStatus.tsx";
import { NoticeRegion } from "../notices/NoticeRegion.tsx";
import { PlayerRegistryContext } from "../playerRegistryContext.ts";
import type { createTestAppStore } from "./createTestAppStore.ts";

type TestAppStore = ReturnType<typeof createTestAppStore>;

export function AppStoreProviders({
  store,
  playerRegistry,
  browserFileRegistry = null,
  sharedSaving,
  children,
}: Pick<TestAppStore, "store" | "playerRegistry"> & {
  browserFileRegistry?: BrowserFileRegistry<File> | null;
  /** The app's shared flashcard-saving parts, such as the list of flashcards that could not be saved, for a test to read; new ones when left out. */
  sharedSaving?: SharedSaving;
  children: ReactNode;
}) {
  return (
    <Provider store={store}>
      <PlayerRegistryContext value={playerRegistry}>
        <BrowserFileRegistryContext value={browserFileRegistry}>
          <SharedSavingProvider shared={sharedSaving}>
            <WordClickMemoryProvider>{children}</WordClickMemoryProvider>
            <NoticeRegion statusLine={<UnsavedCardsStatus />} />
          </SharedSavingProvider>
        </BrowserFileRegistryContext>
      </PlayerRegistryContext>
    </Provider>
  );
}
