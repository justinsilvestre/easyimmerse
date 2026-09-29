import { appActions } from "@easyimmerse/client/state/appActions";
import type { EffectsRunners } from "@easyimmerse/client/state/effects";

/** The functions carrying out the side effects of the app inside the pages of the browser extension. */
export const extensionEffectsRunners: EffectsRunners = {
  resolveServerUrl: (_effect, dispatch) => {
    const serverUrl = import.meta.env.VITE_SERVER_URL ?? null;
    dispatch(appActions.serverUrlResolved(serverUrl));
  },
};
