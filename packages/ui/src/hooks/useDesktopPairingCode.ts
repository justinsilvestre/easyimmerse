import {
  useCurrentPairingCodeQuery,
  useIssuePairingCodeMutation,
} from "@easyimmerse/backend";
import type { DesktopPairingCode } from "../pairing/PairingCodeLine.tsx";

/** How often the desktop asks for the current pairing code, so that a code another device has used is soon replaced on screen. */
const pollingIntervalMs = 2_000;

/** Reads the desktop server's current pairing code while one is needed, and lets the person ask for a new one. */
export function useDesktopPairingCode(isNeeded: boolean) {
  const current = useCurrentPairingCodeQuery(undefined, {
    skip: !isNeeded,
    pollingInterval: pollingIntervalMs,
  });
  const [issue] = useIssuePairingCodeMutation();
  return {
    code: (current.isError
      ? { kind: "failed" }
      : current.data
        ? { kind: "issued", code: current.data }
        : { kind: "loading" }) satisfies DesktopPairingCode,
    renew: () => void issue(),
  };
}
