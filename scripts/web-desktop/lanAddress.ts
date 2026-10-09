import { type NetworkInterfaceInfo, networkInterfaces } from "node:os";

/** Returns this machine's address on the local network, or null when it has none. */
export function findLanAddress(): string | null {
  return selectLanAddress(networkInterfaces());
}

/** Picks the first IPv4 address that is not a loopback address. */
export function selectLanAddress(
  interfaces: NodeJS.Dict<NetworkInterfaceInfo[]>,
): string | null {
  const addresses = Object.values(interfaces).flatMap(
    (entries) => entries ?? [],
  );
  const lan = addresses.find(
    (entry) => entry.family === "IPv4" && !entry.internal,
  );
  return lan?.address ?? null;
}
