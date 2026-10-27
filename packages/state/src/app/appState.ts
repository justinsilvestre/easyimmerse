import type { AccountState } from "../account/updateAccount.ts";
import type { DesktopServerState } from "../desktopServer/desktopServerState.ts";
import type { DictionaryImportWizard } from "../dictionaryImport/dictionaryImportWizard.ts";
import type { MediaImports } from "../mediaImports/mediaImportWizard.ts";
import type { NoticesState } from "../notices/noticesState.ts";
import type { OperationsState } from "../operations/operations.ts";
import type { PairingForm } from "../pairing/pairingForm.ts";
import type { PreferencesState } from "../preferences/preferencesState.ts";
import type { RecoveryState } from "../recovery/updateRecovery.ts";
import type { Route } from "../route/route.ts";
import type { RouteHistory } from "../route/routeHistory.ts";
import type { ScreenState } from "../screen/screenState.ts";
import type { ServerState } from "../server/serverState.ts";
import type { StoredPlacesState } from "../storedPlaces/storedPlacesState.ts";
import type { SyncState } from "../sync/updateSync.ts";

/** The app's own state, one slice per feature. */
export type AppState = {
  /** Where the app is: the screen the location the history last reported names, as `routeAfter` reads it. */
  route: Route;
  /** How the app reached the route: from a link or by its own navigation, and from which history entry. */
  routeHistory: RouteHistory;
  screen: ScreenState;
  server: ServerState;
  preferences: PreferencesState;
  storedPlaces: StoredPlacesState;
  recovery: RecoveryState;
  notices: NoticesState;
  operations: OperationsState;
  /** The adding of a dictionary from a file, which lasts across screens while it runs or its failure waits to be seen. */
  dictionaryImport: DictionaryImportWizard | null;
  /** Each project's media import dialog, which lasts across screens while its fetch runs or its failure waits to be seen. */
  mediaImports: MediaImports;
  account: AccountState;
  /** The pairing of a web or mobile app with a desktop app on the local network. */
  pairing: PairingForm;
  /** The server that the desktop app runs inside itself, as its server controls report it. */
  desktopServer: DesktopServerState;
  /** What the person was told of the native app's syncing with the remote its built-in server is linked to. */
  sync: SyncState;
};
