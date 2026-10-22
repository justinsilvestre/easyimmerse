import { actions } from "../app/appAction.ts";
import type { EffectRunners } from "../app/runEffect.ts";
import type { PairingEffect } from "./pairingEffect.ts";

/** Performs pairing's effects through the platform, and reports each answer as an action. */
export const pairingEffectRunners = {
  scanPairingCode: (_effect, { effects, dispatch }) => {
    effects
      .scanPairingCode()
      .then((text) => dispatch(actions.pairingCodeScanned(text)));
  },
  checkPairingServer: ({ serverUrl }, { effects, dispatch }) => {
    effects
      .fetchServerAuthInfo(serverUrl)
      .then((outcome) =>
        dispatch(
          outcome.ok
            ? actions.pairingServerChecked(serverUrl, outcome.data)
            : actions.pairingFailed(outcome.error),
        ),
      );
  },
  claimPairingCode: ({ serverUrl, code }, { effects, dispatch }) => {
    effects
      .claimPairingCode(serverUrl, code)
      .then((outcome) =>
        dispatch(
          outcome.ok
            ? actions.pairingCodeClaimed(serverUrl, outcome.data)
            : actions.pairingFailed(outcome.error),
        ),
      );
  },
  connectPairedServer: ({ server }, { effects, dispatch }) => {
    effects.connectToServer(server).then((outcome) => {
      if (!outcome.ok) dispatch(actions.pairingFailed(outcome.error));
    });
  },
} satisfies EffectRunners<PairingEffect>;
