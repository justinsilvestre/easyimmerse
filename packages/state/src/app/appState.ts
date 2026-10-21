import type { AccountState } from "../account/updateAccount.ts";
import type { DictionaryImportWizard } from "../dictionaryImport/dictionaryImportWizard.ts";
import type { MediaImports } from "../mediaImports/mediaImportWizard.ts";
import type { NoticesState } from "../notices/noticesState.ts";
import type { OperationsState } from "../operations/operations.ts";
import type { PreferencesState } from "../preferences/preferencesState.ts";
import type { RecoveryState } from "../recovery/updateRecovery.ts";
import type { Route } from "../route/route.ts";
import type { ScreenState } from "../screen/screenState.ts";
import type { ServerState } from "../server/serverState.ts";
import type { StoredPlacesState } from "../storedPlaces/storedPlacesState.ts";

/** The app's own state, one slice per feature. */
export type AppState = {
  /**
   * Where the app is. A library router such as React Router is planned; it will own history, links and deep links,
   * and this field will then be fed from it or replaced by it.
   */
  route: Route;
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
};
