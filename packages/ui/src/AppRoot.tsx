import type { AppStore, PlayerRegistry } from "@easyimmerse/state";
import { actions, selectScreen } from "@easyimmerse/state";
import { Provider } from "react-redux";
import { useAppDispatch } from "./hooks/useAppDispatch.ts";
import { useAppSelector } from "./hooks/useAppSelector.ts";
import { PlayerRegistryContext } from "./playerRegistryContext.ts";
import { HomeScreen } from "./screens/HomeScreen.tsx";
import { MediaScreen } from "./screens/MediaScreen.tsx";

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
        <CurrentScreen />
      </PlayerRegistryContext>
    </Provider>
  );
}

/** Shows the screen the store names. The project screen and the new-project form are stand-ins until they get screens of their own. */
function CurrentScreen() {
  const dispatch = useAppDispatch();
  const screen = useAppSelector(selectScreen);
  switch (screen.kind) {
    case "home":
    case "newProject":
      return <HomeScreen />;
    case "project":
      return (
        <MediaScreen
          projectId={screen.projectId}
          onBack={() => dispatch(actions.homeOpened())}
        />
      );
    case "media":
      return (
        <MediaScreen
          projectId={screen.projectId}
          onBack={() => dispatch(actions.mediaClosed())}
        />
      );
  }
}
