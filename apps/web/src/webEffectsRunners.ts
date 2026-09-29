import { appActions } from "@easyimmerse/client/state/appActions";
import type { EffectsRunners } from "@easyimmerse/client/state/effects";

/** The functions carrying out the side effects of the app inside a web browser. */
export const webEffectsRunners: EffectsRunners = {
  resolveServerUrl: (_effect, dispatch) => {
    const serverUrl = import.meta.env.VITE_SERVER_URL ?? null;
    dispatch(appActions.serverUrlResolved(serverUrl));
  },
};
