import type { AppStore, PlayerRegistry } from "@easyimmerse/state";
import { selectScreen } from "@easyimmerse/state";
import { Provider } from "react-redux";
import { useApplyTheme } from "./hooks/useApplyTheme.ts";
import { useAppSelector } from "./hooks/useAppSelector.ts";
import { useChosenFileHandler } from "./hooks/useChosenFileHandler.ts";
import { useTrackSystemTheme } from "./hooks/useTrackSystemTheme.ts";
import { PlayerRegistryContext } from "./playerRegistryContext.ts";
import { HomeScreen } from "./screens/HomeScreen.tsx";
import { MediaScreen } from "./screens/MediaScreen.tsx";
import { NewProjectScreen } from "./screens/NewProjectScreen.tsx";
import { ProjectScreen } from "./screens/ProjectScreen.tsx";

export function AppRoot({
  store,
  playerRegistry,
}: {
  store: AppStore;
  playerRegistry: PlayerRegistry;
}) {
  return (
    <Provider store={store}>
      <PlayerRegistryContext value={playerRegistry}>
        <ThemeHandler />
        <ChosenFileHandler />
        <CurrentScreen />
      </PlayerRegistryContext>
    </Provider>
  );
}

/** Shows the screen the store names. */
function CurrentScreen() {
  const screen = useAppSelector(selectScreen);
  switch (screen.kind) {
    case "home":
      return <HomeScreen />;
    case "newProject":
      return <NewProjectScreen />;
    case "project":
      return (
        <ProjectScreen key={screen.projectId} projectId={screen.projectId} />
      );
    case "media":
      return (
        <MediaScreen
          key={screen.mediaId}
          projectId={screen.projectId}
          mediaId={screen.mediaId}
        />
      );
  }
}

/** Acts on the files the user picks, whichever screen is showing. */
function ChosenFileHandler() {
  useChosenFileHandler();
  return null;
}

/** Follows the operating system's theme unless the user has switched it, and shows the chosen theme. */
function ThemeHandler() {
  useTrackSystemTheme();
  useApplyTheme();
  return null;
}
