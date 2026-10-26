import { useLicenseNoticesQuery } from "@easyimmerse/backend";
import type {
  MainRoute,
  SettingsPage as SettingsPageName,
} from "@easyimmerse/state";
import {
  actions,
  mainScreenOf,
  selectDesktopPairingServer,
  selectRoute,
  settingsPageOf,
} from "@easyimmerse/state";
import { AccountScreen } from "./screens/account/AccountScreen.tsx";
import { DictionariesScreen } from "./screens/dictionaries/DictionariesScreen.tsx";
import { HomeScreen } from "./screens/home/HomeScreen.tsx";
import { OfflineScreen } from "./screens/home/OfflineScreen.tsx";
import { LibraryScreen } from "./screens/library/LibraryScreen.tsx";
import { LibraryEditScreen } from "./screens/libraryEdit/LibraryEditScreen.tsx";
import { LibraryItemScreen } from "./screens/libraryItem/LibraryItemScreen.tsx";
import { LibraryManageScreen } from "./screens/libraryManage/LibraryManageScreen.tsx";
import { PairingScreen } from "./screens/pairing/PairingScreen.tsx";
import { ProjectScreen } from "./screens/project/ProjectScreen.tsx";
import { NewProjectScreen } from "./screens/projectSettings/NewProjectScreen.tsx";
import { ProjectSettingsScreen } from "./screens/projectSettings/ProjectSettingsScreen.tsx";
import { ConnectedReviewScreen } from "./screens/review/ConnectedReviewScreen.tsx";
import { ServerScreen } from "./screens/server/ServerScreen.tsx";
import { licenseNoticesStateOf } from "./screens/settings/licenseNoticesStateOf.ts";
import { SettingsScreen } from "./screens/settings/SettingsScreen.tsx";
import { useConversionCacheControls } from "./screens/settings/useConversionCacheControls.ts";
import { useFfmpegBuildControls } from "./screens/settings/useFfmpegBuildControls.ts";
import { UsersScreen } from "./screens/users/UsersScreen.tsx";
import { useAppDispatch } from "./useAppDispatch.ts";
import { useAppSelector } from "./useAppSelector.ts";
import { useNavigate } from "./useNavigate.ts";

/** The main screen, with Settings over it while they are open. */
export function Screens() {
  const route = useAppSelector(selectRoute);
  return (
    <>
      <div inert={route.screen === "settings"}>
        <MainScreen route={mainScreenOf(route)} />
      </div>
      {route.screen === "settings" && (
        <SettingsOverlay>
          <SettingsPage page={settingsPageOf(route)} />
        </SettingsOverlay>
      )}
    </>
  );
}

function MainScreen({ route }: { route: MainRoute }) {
  const go = useNavigate();
  const openProject = (projectId: string) =>
    go({ type: "openProject", projectId });
  const goHome = () => go({ type: "goHome" });
  switch (route.screen) {
    case "home":
      return (
        <HomeScreen
          onOpenProject={openProject}
          onReviewProject={(projectId) => go({ type: "openReview", projectId })}
          onCreateProject={() => go({ type: "createProject" })}
          onContinueOffline={() => go({ type: "continueOffline" })}
        />
      );
    case "offline":
      return <OfflineScreen onBack={goHome} />;
    case "newProject":
      return <NewProjectScreen onCancel={goHome} />;
    case "project":
    case "media":
      return (
        <ProjectScreen
          projectId={route.projectId}
          onBack={goHome}
          onEditSettings={() =>
            go({ type: "openProjectSettings", projectId: route.projectId })
          }
        />
      );
    case "projectSettings":
      return (
        <ProjectSettingsScreen
          projectId={route.projectId}
          onCancel={() => openProject(route.projectId)}
        />
      );
    case "review":
      return (
        <ConnectedReviewScreen
          projectId={route.projectId}
          onBack={() => openProject(route.projectId)}
        />
      );
    case "library":
      return <LibraryScreen />;
    case "libraryItem":
      return <LibraryItemScreen key={route.itemId} itemId={route.itemId} />;
    case "libraryManage":
      return <LibraryManageScreen />;
    case "libraryEdit":
      return <LibraryEditScreen key={route.itemId} itemId={route.itemId} />;
  }
}

/** The settings page on top of the settings stack. */
function SettingsPage({ page }: { page: SettingsPageName }) {
  const go = useNavigate();
  const onBack = () => go({ type: "closeSettings" });
  switch (page) {
    case "general":
      return (
        <ConnectedSettingsScreen
          onBack={onBack}
          onOpenAccount={() => go({ type: "openAccountSettings" })}
          onOpenDictionaries={() => go({ type: "openDictionaries" })}
        />
      );
    case "account":
      return <AccountScreen onBack={onBack} />;
    case "dictionaries":
      return <DictionariesScreen onBack={onBack} />;
    case "pairing":
      return <ConnectedPairingScreen onBack={onBack} />;
    case "server":
      return <ServerScreen onBack={onBack} />;
    case "users":
      return <UsersScreen via="self" onBack={onBack} />;
    case "linkedRemoteUsers":
      return <UsersScreen via="linkedRemote" onBack={onBack} />;
  }
}

/** The pairing page with the desktop app's server, which its button starts where the local network reaches it. */
function ConnectedPairingScreen({ onBack }: { onBack: () => void }) {
  const dispatch = useAppDispatch();
  return (
    <PairingScreen
      onBack={onBack}
      desktopServer={useAppSelector(selectDesktopPairingServer)}
      onStartDesktopServer={() =>
        dispatch(actions.desktopServerLanStartRequested())
      }
    />
  );
}

/** The Settings screen with the converted-videos status and the desktop app's ffmpeg build from the server, and the bundled license notices. */
function ConnectedSettingsScreen({
  onBack,
  onOpenAccount,
  onOpenDictionaries,
}: {
  onBack: () => void;
  onOpenAccount: () => void;
  onOpenDictionaries: () => void;
}) {
  return (
    <SettingsScreen
      onBack={onBack}
      onOpenAccount={onOpenAccount}
      onOpenDictionaries={onOpenDictionaries}
      conversionCache={useConversionCacheControls()}
      ffmpegBuild={useFfmpegBuildControls()}
      licenseNotices={licenseNoticesStateOf(useLicenseNoticesQuery())}
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
