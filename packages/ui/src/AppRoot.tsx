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
import { useApplyTextScale } from "./hooks/useApplyTextScale.ts";
import { useApplyTheme } from "./hooks/useApplyTheme.ts";
import { useConversionCacheControls } from "./hooks/useConversionCacheControls.ts";
import { useLicenseNotices } from "./hooks/useLicenseNotices.ts";
import { useTrackSystemTheme } from "./hooks/useTrackSystemTheme.ts";
import type {
  MainNavigation,
  Navigation,
  NavigationAction,
} from "./navigation.ts";
import {
  initialNavigation,
  mainScreenOf,
  navigate,
  settingsPageOf,
} from "./navigation.ts";
import { NavigationActionsContext } from "./navigationContext.ts";
import { PlayerRegistryContext } from "./playerRegistryContext.ts";
import { DictionariesScreen } from "./screens/DictionariesScreen.tsx";
import { HomeScreen } from "./screens/HomeScreen.tsx";
import { NewProjectScreen } from "./screens/NewProjectScreen.tsx";
import { OfflineScreen } from "./screens/OfflineScreen.tsx";
import { ProjectScreen } from "./screens/ProjectScreen.tsx";
import { ProjectSettingsScreen } from "./screens/ProjectSettingsScreen.tsx";
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
  const navigationActions = {
    openSettings: () => dispatchNavigation({ type: "openSettings" }),
    openDictionaries: () => dispatchNavigation({ type: "openDictionaries" }),
  };
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
          <NavigationActionsContext value={navigationActions}>
            <AppearanceHandler />
            <PreferencesLoader />
            <div inert={settingsOpen}>
              <MainScreen
                navigation={mainScreenOf(navigation)}
                dispatchNavigation={dispatchNavigation}
              />
            </div>
            {navigation.screen === "settings" && (
              <SettingsOverlay>
                <SettingsPage
                  navigation={navigation}
                  dispatchNavigation={dispatchNavigation}
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
  const openProject = (projectId: string) =>
    dispatchNavigation({ type: "openProject", projectId });
  const goHome = () => dispatchNavigation({ type: "goHome" });
  switch (navigation.screen) {
    case "home":
      return (
        <HomeScreen
          onOpenProject={openProject}
          onCreateProject={() => dispatchNavigation({ type: "createProject" })}
          onContinueOffline={() =>
            dispatchNavigation({ type: "continueOffline" })
          }
        />
      );
    case "offline":
      return <OfflineScreen onBack={goHome} />;
    case "newProject":
      return <NewProjectScreen onCreated={openProject} onCancel={goHome} />;
    case "project":
      return (
        <ProjectScreen
          projectId={navigation.projectId}
          onBack={goHome}
          onEditSettings={() =>
            dispatchNavigation({
              type: "openProjectSettings",
              projectId: navigation.projectId,
            })
          }
        />
      );
    case "projectSettings":
      return (
        <ProjectSettingsScreen
          projectId={navigation.projectId}
          onDone={() => openProject(navigation.projectId)}
        />
      );
  }
}

/** The settings page on top of the settings stack. */
function SettingsPage({
  navigation,
  dispatchNavigation,
}: {
  navigation: Extract<Navigation, { screen: "settings" }>;
  dispatchNavigation: (action: NavigationAction) => void;
}) {
  const onBack = () => dispatchNavigation({ type: "closeSettings" });
  switch (settingsPageOf(navigation)) {
    case "general":
      return (
        <ConnectedSettingsScreen
          onBack={onBack}
          onOpenDictionaries={() =>
            dispatchNavigation({ type: "openDictionaries" })
          }
        />
      );
    case "dictionaries":
      return <DictionariesScreen onBack={onBack} />;
  }
}

/** The Settings screen with the converted-videos status from the server and the bundled license notices. */
function ConnectedSettingsScreen({
  onBack,
  onOpenDictionaries,
}: {
  onBack: () => void;
  onOpenDictionaries: () => void;
}) {
  return (
    <SettingsScreen
      onBack={onBack}
      onOpenDictionaries={onOpenDictionaries}
      conversionCache={useConversionCacheControls()}
      licenseNotices={useLicenseNotices()}
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

/** Follows the operating system's theme unless the user has switched it, and shows the chosen theme and text size. */
function AppearanceHandler() {
  useTrackSystemTheme();
  useApplyTheme();
  useApplyTextScale();
  return null;
}
