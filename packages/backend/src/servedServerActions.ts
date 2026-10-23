import type { AppAction } from "@easyimmerse/state";
import { actions } from "@easyimmerse/state";
import type { ServedServerOutcome } from "./resolveServedServer.ts";

/**
 * The actions that show what the web app learned about its server, once the store exists.
 * An offered or failed pairing opens the pairing page with the address and code filled in, and a failure with its message.
 * A server with accounts fills in the sign-in form, and a server without accounts fills in the pairing form's address.
 */
export function servedServerActions(outcome: ServedServerOutcome): AppAction[] {
  switch (outcome.kind) {
    case "pairingOffered":
      return [
        actions.pairingFormChanged({
          address: outcome.serverUrl,
          code: outcome.code,
        }),
        actions.navigated({ type: "openPairing" }),
      ];
    case "pairingFailed":
      return [
        actions.pairingFormChanged({
          address: outcome.serverUrl,
          code: outcome.code,
        }),
        actions.pairingFailed(outcome.failure),
        actions.navigated({ type: "openPairing" }),
      ];
    case "serverFound":
      return outcome.info.accounts
        ? [
            actions.signInFormChanged({
              serverChoice: "own",
              ownServerUrl: outcome.serverUrl,
            }),
          ]
        : [actions.pairingFormChanged({ address: outcome.serverUrl })];
    default:
      return [];
  }
}
