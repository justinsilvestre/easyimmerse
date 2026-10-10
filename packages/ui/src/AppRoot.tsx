import type {
  AppStore,
  BrowserFileRegistry,
  PlayerRegistry,
} from "@easyimmerse/state";
import { actions } from "@easyimmerse/state";
import { useEffect } from "react";
import { Provider } from "react-redux";
import { BrowserFileRegistryContext } from "./browserFileRegistryContext.ts";
import { WordClickMemoryProvider } from "./components/wordClickMemoryContext.tsx";
import { SharedSavingProvider } from "./flashcards/SharedSavingContext.tsx";
import { UnsavedCardsStatus } from "./flashcards/unsaved/UnsavedCardsStatus.tsx";
import { useAppDispatch } from "./hooks/useAppDispatch.ts";
import { useApplyTextScale } from "./hooks/useApplyTextScale.ts";
import { useApplyTheme } from "./hooks/useApplyTheme.ts";
import { useTrackSystemTheme } from "./hooks/useTrackSystemTheme.ts";
import { NoticeRegion } from "./notices/NoticeRegion.tsx";
import { PlayerRegistryContext } from "./playerRegistryContext.ts";
import { Screens } from "./Screens.tsx";

export function AppRoot({
  store,
  playerRegistry,
  browserFileRegistry = null,
}: {
  store: AppStore;
  playerRegistry: PlayerRegistry;
  /** Where the web app keeps the media files it picked. Absent on platforms that read files from disk. */
  browserFileRegistry?: BrowserFileRegistry<File> | null;
}) {
  return (
    <Provider store={store}>
      <SharedSavingProvider>
        <PlayerRegistryContext value={playerRegistry}>
          <BrowserFileRegistryContext value={browserFileRegistry}>
            <WordClickMemoryProvider>
              <AppearanceHandler />
              <PreferencesLoader />
              <Screens />
            </WordClickMemoryProvider>
          </BrowserFileRegistryContext>
        </PlayerRegistryContext>
        <NoticeRegion statusLine={<UnsavedCardsStatus />} />
      </SharedSavingProvider>
    </Provider>
  );
}

/** Reads the stored preferences once, when the app starts. */
function PreferencesLoader() {
  const dispatch = useAppDispatch();
  useEffect(() => {
    dispatch(actions.preferencesLoadRequested());
  }, [dispatch]);
  return null;
}

/** Follows the operating system's theme unless the user has switched it, and shows the chosen theme and text size. */
function AppearanceHandler() {
  useTrackSystemTheme();
  useApplyTheme();
  useApplyTextScale();
  return null;
}
