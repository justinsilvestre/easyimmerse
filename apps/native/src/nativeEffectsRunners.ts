import { appActions } from "@easyimmerse/client/state/appActions";
import type { EffectsRunners } from "@easyimmerse/client/state/effects";
import { invoke } from "@tauri-apps/api/core";

/** The functions carrying out the side effects of the app inside the desktop and mobile apps. */
export const nativeEffectsRunners: EffectsRunners = {
  resolveServerUrl: async (_effect, dispatch) => {
    const serverUrl = await invoke<string | null>("get_server_url");
    dispatch(appActions.serverUrlResolved(serverUrl));
  },
};
