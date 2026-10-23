import type { AppAction } from "../app/appAction.ts";
import { actions } from "../app/appAction.ts";
import { dispatch } from "../app/dispatchEffect.ts";
import type { Feature, ReadableState } from "../app/feature.ts";
import { updated } from "../app/updated.ts";
import {
  canSubmitPairing,
  enteredCodeOf,
  initialPairingForm,
  isPairingBusy,
  type PairingForm,
  pairingServerUrlOf,
} from "./pairingForm.ts";
import { parsePairingUrl } from "./pairingUrl.ts";

/**
 * Keeps the pairing form and leads a pairing through its steps: it asks the server whether it has accounts,
 * then exchanges the code for the server's token and connects the app to the server.
 * A server with accounts takes no code: the Account page's sign-in form opens with its address instead,
 * and the pairing form returns to idle, so that it shows no notice when the person comes back to it.
 * The mobile app reads QR codes through the platform's scanner; elsewhere the UI's camera view reports what it reads.
 */
export function updatePairing(
  form: PairingForm,
  action: AppAction,
  { server }: Pick<ReadableState, "server">,
) {
  switch (action.type) {
    case "pairingFormChanged":
      if (isPairingBusy(form)) return updated(form);
      return updated({ ...form, ...action.changes, status: { kind: "idle" } });
    case "pairingSubmitted":
      return submitForm(form);
    case "pairingScanRequested":
      if (isPairingBusy(form)) return updated(form);
      return server.config?.bundledIn === "mobile"
        ? updated(
            { ...form, status: { kind: "scanning" } },
            { type: "scanPairingCode" },
          )
        : updated({ ...form, status: { kind: "scanning" } });
    case "pairingScanCancelled":
      if (form.status.kind !== "scanning") return updated(form);
      return action.reason === "cameraUnavailable"
        ? updated({ ...form, status: { kind: "cameraUnavailable" } })
        : updated({ ...form, status: { kind: "idle" } });
    case "pairingCodeScanned":
      return pairWithScannedText(form, action.text);
    case "pairingServerChecked":
      return continueWithCheckedServer(form, action);
    case "pairingCodeClaimed":
      if (form.status.kind !== "claiming") return updated(form);
      return updated(
        { ...form, status: { kind: "connecting" } },
        {
          type: "connectPairedServer",
          server: { serverUrl: action.serverUrl, token: action.grant.token },
        },
      );
    case "pairingFailed":
      return updated({
        ...form,
        status: { kind: "failed", failure: action.failure },
      });
    default:
      return updated(form);
  }
}

function submitForm(form: PairingForm) {
  const serverUrl = pairingServerUrlOf(form);
  if (serverUrl === null || !canSubmitPairing(form)) return updated(form);
  return updated(
    { ...form, status: { kind: "checkingServer" } },
    { type: "checkPairingServer", serverUrl },
  );
}

function pairWithScannedText(form: PairingForm, text: string) {
  if (form.status.kind !== "scanning") return updated(form);
  const target = parsePairingUrl(text);
  if (target === null)
    return updated({ ...form, status: { kind: "unrecognizedQrCode" } });
  return submitForm({
    address: target.serverUrl,
    code: target.code ?? "",
    status: { kind: "idle" },
  });
}

function continueWithCheckedServer(
  form: PairingForm,
  action: Extract<AppAction, { type: "pairingServerChecked" }>,
) {
  const isAwaited =
    form.status.kind === "checkingServer" &&
    pairingServerUrlOf(form) === action.serverUrl;
  if (!isAwaited) return updated(form);
  if (action.info.accounts)
    return updated(
      { ...form, status: { kind: "idle" } },
      dispatch(
        actions.signInFormChanged({
          serverChoice: "own",
          ownServerUrl: action.serverUrl,
        }),
      ),
      dispatch(actions.navigated({ type: "openAccountSettings" })),
    );
  const code = enteredCodeOf(form);
  if (code === "") return updated({ ...form, status: { kind: "codeMissing" } });
  return updated(
    { ...form, status: { kind: "claiming" } },
    { type: "claimPairingCode", serverUrl: action.serverUrl, code },
  );
}

/** Pairing as a feature. */
export const pairingFeature: Feature<PairingForm, "server"> = {
  initialState: initialPairingForm,
  update: updatePairing,
};
