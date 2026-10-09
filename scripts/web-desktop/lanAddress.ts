import { type NetworkInterfaceInfo, networkInterfaces } from "node:os";

/**
 * Returns this machine's address on the local network, or null when it has none.
 * `EASYIMMERSE_LAN_ADDRESS` overrides the detected address.
 */
export function findLanAddress(): string | null {
  return selectLanAddress(
    networkInterfaces(),
    process.env.EASYIMMERSE_LAN_ADDRESS,
  );
}

/**
 * Returns `override` when given, or else picks the first IPv4 address that is not a loopback address,
 * preferring one in a private range over others such as a VPN's.
 */
export function selectLanAddress(
  interfaces: NodeJS.Dict<NetworkInterfaceInfo[]>,
  override?: string,
): string | null {
  if (override) return override;
  const candidates = Object.values(interfaces)
    .flatMap((entries) => entries ?? [])
    .filter((entry) => entry.family === "IPv4" && !entry.internal)
    .map((entry) => entry.address);
  return candidates.find(isPrivateAddress) ?? candidates[0] ?? null;
}

/** Whether an IPv4 address lies in 10.0.0.0/8, 172.16.0.0/12, or 192.168.0.0/16. */
function isPrivateAddress(address: string): boolean {
  const [first, second] = address.split(".").map(Number);
  if (first === 10) return true;
  if (first === 192) return second === 168;
  return first === 172 && second !== undefined && second >= 16 && second <= 31;
}
