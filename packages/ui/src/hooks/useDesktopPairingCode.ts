import {
  useIssuedPairingCodeState,
  useIssuePairingCodeQuery,
} from "@easyimmerse/backend";
import type { DesktopPairingCode } from "../pairing/PairingCodeLine.tsx";
import { pairingCodeRenewalDelayMs } from "../pairing/pairingCodeRenewalDelay.ts";

/**
 * Reads the desktop server's pairing code while one is needed, and asks for a new one shortly before it expires.
 * A code that is still valid is kept when the pairing page opens again.
 */
export function useDesktopPairingCode(isNeeded: boolean) {
  const cached = useIssuedPairingCodeState(undefined).data;
  const issued = useIssuePairingCodeQuery(undefined, {
    skip: !isNeeded,
    pollingInterval:
      cached === undefined
        ? 0
        : pairingCodeRenewalDelayMs(cached.expires_at, Date.now()),
  });
  return {
    code: (issued.isError
      ? { kind: "failed" }
      : issued.data
        ? { kind: "issued", code: issued.data }
        : { kind: "loading" }) satisfies DesktopPairingCode,
    renew: () => void issued.refetch(),
  };
}
