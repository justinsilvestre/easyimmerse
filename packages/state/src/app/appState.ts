import type { FlashcardsState } from "../flashcards/flashcardsState.ts";
import type { NoticesState } from "../notices/noticesState.ts";
import type { OperationsState } from "../operations/operations.ts";
import type { PreferencesState } from "../preferences/preferencesState.ts";
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
  flashcards: FlashcardsState;
  notices: NoticesState;
  operations: OperationsState;
};
