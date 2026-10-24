import type {
  AppStore,
  BrowserFileRegistry,
  PlayerRegistry,
} from "@easyimmerse/state";
import { Provider } from "react-redux";
import { BrowserFileRegistryContext } from "./browserFileRegistryContext.ts";
import { FailedSavesStatus } from "./components/notices/FailedSavesStatus.tsx";
import { NoticeRegion } from "./components/notices/NoticeRegion.tsx";
import { WordClickMemoryProvider } from "./components/wordLookup/wordClickMemoryContext.tsx";
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
      <PlayerRegistryContext value={playerRegistry}>
        <BrowserFileRegistryContext value={browserFileRegistry}>
          <WordClickMemoryProvider>
            <Screens />
          </WordClickMemoryProvider>
        </BrowserFileRegistryContext>
      </PlayerRegistryContext>
      <NoticeRegion statusLine={<FailedSavesStatus />} />
    </Provider>
  );
}
