import { ffmpegNotices } from "@easyimmerse/licenses";
import type {
  AppStore,
  BrowserFileRegistry,
  Effects,
  PlayerRegistry,
} from "@easyimmerse/state";
import { actions } from "@easyimmerse/state";
import { useEffect, useReducer } from "react";
import { Provider } from "react-redux";
import { BrowserFileRegistryContext } from "./browserFileRegistryContext.ts";
import { useAppDispatch } from "./hooks/useAppDispatch.ts";
import { useApplyTheme } from "./hooks/useApplyTheme.ts";
import { useConversionCacheControls } from "./hooks/useConversionCacheControls.ts";
import { useTrackSystemTheme } from "./hooks/useTrackSystemTheme.ts";
import type { MainNavigation, NavigationAction } from "./navigation.ts";
import { initialNavigation, mainScreenOf, navigate } from "./navigation.ts";
import { NavigationActionsContext } from "./navigationContext.ts";
import { PlayerRegistryContext } from "./playerRegistryContext.ts";
import { HomeScreen } from "./screens/HomeScreen.tsx";
import { MediaScreen } from "./screens/MediaScreen.tsx";
import { SettingsScreen } from "./screens/SettingsScreen.tsx";

export function AppRoot({
  store,
  playerRegistry,
  effects,
  browserFileRegistry = null,
}: {
  store: AppStore;
  playerRegistry: PlayerRegistry;
  effects: Effects;
  /** Where the web app keeps the media files it picked. Absent on platforms that read files from disk. */
  browserFileRegistry?: BrowserFileRegistry<File> | null;
}) {
  const [navigation, dispatchNavigation] = useReducer(
    navigate,
    initialNavigation,
  );
  const openSettings = () => dispatchNavigation({ type: "openSettings" });
  useEffect(
    () =>
      effects.subscribeToSettingsRequests(() =>
        dispatchNavigation({ type: "openSettings" }),
      ),
    [effects],
  );
  const settingsOpen = navigation.screen === "settings";
  return (
    <Provider store={store}>
      <PlayerRegistryContext value={playerRegistry}>
        <BrowserFileRegistryContext value={browserFileRegistry}>
          <NavigationActionsContext value={{ openSettings }}>
            <ThemeHandler />
            <PreferencesLoader />
            <div inert={settingsOpen}>
              <MainScreen
                navigation={mainScreenOf(navigation)}
                dispatchNavigation={dispatchNavigation}
              />
            </div>
            {settingsOpen && (
              <SettingsOverlay>
                <ConnectedSettingsScreen
                  onBack={() => dispatchNavigation({ type: "closeSettings" })}
                />
              </SettingsOverlay>
            )}
          </NavigationActionsContext>
        </BrowserFileRegistryContext>
      </PlayerRegistryContext>
    </Provider>
  );
}

function MainScreen({
  navigation,
  dispatchNavigation,
}: {
  navigation: MainNavigation;
  dispatchNavigation: (action: NavigationAction) => void;
}) {
  return navigation.screen === "home" ? (
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
  );
}

/** The Settings screen with the converted-videos status from the server and the bundled license notices. */
function ConnectedSettingsScreen({ onBack }: { onBack: () => void }) {
  return (
    <SettingsScreen
      onBack={onBack}
      conversionCache={useConversionCacheControls()}
      licenseNotices={ffmpegNotices}
    />
  );
}

/** Covers the main screen without unmounting it, so that what is beneath keeps its state. */
function SettingsOverlay({ children }: { children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-10 overflow-y-auto overscroll-contain bg-canvas">
      {children}
    </div>
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

/** Follows the operating system's theme unless the user has switched it, and shows the chosen theme. */
function ThemeHandler() {
  useTrackSystemTheme();
  useApplyTheme();
  return null;
}
