/** The address and port a server listens on, read from text such as `0.0.0.0:8787` or `[::1]:8787`. */
export type BindAddress = { host: string; port: number };

/** What reading a bind address gave: the address, or why the text is not one. */
export type BindAddressReading =
  | { ok: true; address: BindAddress }
  | { ok: false; problem: string };

const bindPattern = /^(\d{1,3}(?:\.\d{1,3}){3}|\[[0-9a-f:.]+\]):(\d{1,5})$/i;

const highestPort = 65_535;

/** Reads an IPv4 address or a bracketed IPv6 address followed by a port, as the server's settings take them. */
export function readBindAddress(text: string): BindAddressReading {
  const parts = bindPattern.exec(text.trim());
  const [, host = "", portText = ""] = parts ?? [];
  if (parts === null || !hasValidOctets(host))
    return {
      ok: false,
      problem: "Enter an IP address and a port, such as 0.0.0.0:8787.",
    };
  const port = Number(portText);
  if (port < 1 || port > highestPort)
    return {
      ok: false,
      problem: "The port must be a number from 1 to 65535.",
    };
  return { ok: true, address: { host: host.toLowerCase(), port } };
}

/** Tells whether only this computer can reach a server listening on the address. */
export function isLoopbackAddress({ host }: BindAddress): boolean {
  return host.startsWith("127.") || host === "[::1]";
}

/**
 * Returns the bind address that listens on the local network at the same port, when the given one listens only on this computer.
 * Returns null when the bind address already reaches the network or cannot be read.
 */
export function lanBindOf(bind: string): string | null {
  const reading = readBindAddress(bind);
  if (!reading.ok || !isLoopbackAddress(reading.address)) return null;
  return `0.0.0.0:${reading.address.port}`;
}

function hasValidOctets(host: string): boolean {
  if (host.startsWith("[")) return true;
  return host.split(".").every((octet) => Number(octet) <= 255);
}
