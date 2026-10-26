import { useLicenseNoticesQuery } from "@easyimmerse/backend";
import type { MainRoute, Route } from "@easyimmerse/state";
import {
  actions,
  mainScreenOf,
  selectDesktopPairingServer,
  selectRoute,
  settingsPageOf,
  upPathOf,
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

type SettingsRoute = Extract<Route, { screen: "settings" }>;

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
          <SettingsPage route={route} />
        </SettingsOverlay>
      )}
    </>
  );
}

function MainScreen({ route }: { route: MainRoute }) {
  const go = useNavigate();
  const openProject = (projectId: string) =>
    go({ type: "openProject", projectId });
  switch (route.screen) {
    case "home":
      return <HomeScreen />;
    case "offline":
      return <OfflineScreen />;
    case "newProject":
      return <NewProjectScreen onCancel={() => go({ type: "goHome" })} />;
    case "project":
    case "media":
      return <ProjectScreen projectId={route.projectId} />;
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

/** The settings page on top of the settings stack, whose Back link leads to the page below it or to the screen beneath Settings. */
function SettingsPage({ route }: { route: SettingsRoute }) {
  const backHref = upPathOf(route) ?? "/";
  switch (settingsPageOf(route)) {
    case "general":
      return <ConnectedSettingsScreen backHref={backHref} />;
    case "account":
      return <AccountScreen backHref={backHref} />;
    case "dictionaries":
      return <DictionariesScreen backHref={backHref} />;
    case "pairing":
      return <ConnectedPairingScreen backHref={backHref} />;
    case "server":
      return <ServerScreen backHref={backHref} />;
    case "users":
      return <UsersScreen via="self" backHref={backHref} />;
    case "linkedRemoteUsers":
      return <UsersScreen via="linkedRemote" backHref={backHref} />;
  }
}

/** The pairing page with the desktop app's server, which its button starts where the local network reaches it. */
function ConnectedPairingScreen({ backHref }: { backHref: string }) {
  const dispatch = useAppDispatch();
  return (
    <PairingScreen
      backHref={backHref}
      desktopServer={useAppSelector(selectDesktopPairingServer)}
      onStartDesktopServer={() =>
        dispatch(actions.desktopServerLanStartRequested())
      }
    />
  );
}

/** The Settings screen with the converted-videos status and the desktop app's ffmpeg build from the server, and the bundled license notices. */
function ConnectedSettingsScreen({ backHref }: { backHref: string }) {
  return (
    <SettingsScreen
      backHref={backHref}
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
