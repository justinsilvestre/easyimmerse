import { connectionNotKeptCode } from "../account/signInAttempt.ts";
import type { RequestFailure } from "../server/serverRequest.ts";

/** Tells a person why pairing with the server at the address failed. */
export function pairingFailureMessage(
  failure: RequestFailure,
  serverUrl: string,
) {
  if (failure.code === "pairing_code_invalid")
    return "This code is wrong or has expired. Enter the code that the desktop app shows now.";
  if (failure.code === "too_many_attempts")
    return tooManyAttemptsMessage(failure.retryAfterSeconds);
  if (failure.code === connectionNotKeptCode)
    return "The connection to the desktop app could not be saved on this device.";
  if (failure.status === "NETWORK")
    return `This device could not reach easyImmerse at ${serverUrl}. Check the address, and that both devices are on the same network.`;
  if (failure.status === 404 || failure.status === "NO_DATA")
    return `The address ${serverUrl} does not lead to an easyImmerse server. Check the address.`;
  return `The server could not pair this device: ${failure.message}`;
}

function tooManyAttemptsMessage(retryAfterSeconds: number | undefined): string {
  if (retryAfterSeconds === undefined)
    return "Too many wrong codes were entered. Try again in a few minutes.";
  const minutes = Math.max(1, Math.ceil(retryAfterSeconds / 60));
  return `Too many wrong codes were entered. Try again in ${minutes === 1 ? "a minute" : `${minutes} minutes`}.`;
}
