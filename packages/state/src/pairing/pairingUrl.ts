/** Where a pairing leads: the server's address, and the pairing code when the server has no accounts. */
export type PairingTarget = { serverUrl: string; code: string | null };

/** The key in a pairing URL's fragment that holds the pairing code, as in `http://192.168.1.5:8787/#pair=123456`. */
export const pairingFragmentKey = "pair";

/**
 * Reads a pairing URL, `<origin>/#pair=<code>` or `<origin>/`, as a QR code holds it or a person types it.
 * An address without a scheme counts as HTTP. Returns null when the text is not an HTTP or HTTPS address.
 */
export function parsePairingUrl(text: string): PairingTarget | null {
  const parts = httpUrlPattern.exec(withScheme(text.trim()));
  if (parts === null) return null;
  const [, scheme = "", host = "", port, , hash = ""] = parts;
  const origin = `${scheme.toLowerCase()}://${host.toLowerCase()}`;
  const isDefaultPort =
    port === undefined || port === defaultPorts[scheme.toLowerCase()];
  return {
    serverUrl: isDefaultPort ? origin : `${origin}:${port}`,
    code: pairingCodeOf(hash),
  };
}

/** The pairing code that a URL's fragment, such as `#pair=123456`, holds, or null when it holds none. */
export function pairingCodeOf(hash: string): string | null {
  const prefix = `${pairingFragmentKey}=`;
  const entry = hash
    .replace(/^#/, "")
    .split("&")
    .find((part) => part.startsWith(prefix));
  return decoded(entry?.slice(prefix.length) ?? "").trim() || null;
}

function decoded(text: string): string {
  try {
    return decodeURIComponent(text);
  } catch {
    return text;
  }
}

/** Builds the pairing URL that a QR code shows for the server, with the code when there is one. */
export function pairingUrlOf(serverUrl: string, code: string | null): string {
  const origin = parsePairingUrl(serverUrl)?.serverUrl ?? serverUrl;
  return code === null
    ? `${origin}/`
    : `${origin}/#${pairingFragmentKey}=${encodeURIComponent(code)}`;
}

/**
 * An HTTP or HTTPS URL: its scheme, a host name or an IPv4 or bracketed IPv6 address, an optional port,
 * an optional path and query, and an optional fragment. The state package has no DOM, so no `URL` parses it.
 */
const httpUrlPattern =
  /^(https?):\/\/([a-z0-9.-]+|\[[0-9a-f:.]+\])(?::(\d{1,5}))?([/?][^\s#]*)?(#\S*)?$/i;

const defaultPorts: Record<string, string> = { http: "80", https: "443" };

function withScheme(text: string): string {
  return /^[a-z][a-z0-9+.-]*:\/\//i.test(text) ? text : `http://${text}`;
}
