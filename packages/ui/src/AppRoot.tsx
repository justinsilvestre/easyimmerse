import type { AppStore, PlayerRegistry } from "@easyimmerse/state";
import { actions } from "@easyimmerse/state";
import { useEffect, useReducer } from "react";
import { Provider } from "react-redux";
import {
  type AppFeatures,
  AppFeaturesContext,
  defaultAppFeatures,
} from "./appFeaturesContext.ts";
import { useAppDispatch } from "./hooks/useAppDispatch.ts";
import { useApplyTextScale } from "./hooks/useApplyTextScale.ts";
import { useApplyTheme } from "./hooks/useApplyTheme.ts";
import { useTrackSystemTheme } from "./hooks/useTrackSystemTheme.ts";
import { initialNavigation, navigate } from "./navigation.ts";
import { PlayerRegistryContext } from "./playerRegistryContext.ts";
import { HomeScreen } from "./screens/HomeScreen.tsx";
import { MediaScreen } from "./screens/MediaScreen.tsx";

export function AppRoot({
  store,
  playerRegistry,
  features = defaultAppFeatures,
}: {
  store: AppStore;
  playerRegistry: PlayerRegistry;
  features?: AppFeatures;
}) {
  const [navigation, dispatchNavigation] = useReducer(
    navigate,
    initialNavigation,
  );
  return (
    <Provider store={store}>
      <PlayerRegistryContext value={playerRegistry}>
        <AppFeaturesContext value={features}>
          <AppearanceHandler />
          {navigation.screen === "home" ? (
            <HomeScreen
              onOpenProject={(projectId) =>
                dispatchNavigation({ type: "openProject", projectId })
              }
            />
          ) : (
            <MediaScreen
              projectId={navigation.projectId}
              onBack={() => dispatchNavigation({ type: "goHome" })}
            />
          )}
        </AppFeaturesContext>
      </PlayerRegistryContext>
    </Provider>
  );
}

/** Follows the operating system's theme unless the user has switched it, and shows the chosen theme and text size. */
function AppearanceHandler() {
  const dispatch = useAppDispatch();
  useTrackSystemTheme();
  useApplyTheme();
  useApplyTextScale();
  useEffect(() => {
    dispatch(actions.preferencesLoadRequested());
  }, [dispatch]);
  return null;
}
