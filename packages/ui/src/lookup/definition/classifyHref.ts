/** Where a link in a definition leads: another lookup, an element of the same definition, an external page, a sound in the dictionary, or nowhere. */
export type LinkTarget =
  | { kind: "lookup"; term: string }
  | { kind: "fragment"; id: string }
  | { kind: "external"; url: string }
  | { kind: "sound"; path: string }
  | { kind: "none" };

const none: LinkTarget = { kind: "none" };

/**
 * Reads a link from dictionary content.
 * `?query=` (Yomitan), `bword://` (StarDict) and `entry://` (MDict) links become lookups, `#id` and `entry://#id` links lead to an element of the same definition, `sound://` links sounds, and `http(s)` links external pages.
 * Any other link, including `javascript:`, leads nowhere.
 */
export function classifyHref(href: string): LinkTarget {
  const trimmed = href.trim();
  if (trimmed.startsWith("?"))
    return lookup(new URLSearchParams(trimmed.slice(1)).get("query"));
  if (trimmed.startsWith("#")) return fragment(trimmed.slice(1));
  const [, scheme, rest = ""] =
    trimmed.match(/^([a-z][a-z0-9+.-]*):\/\/(.*)$/is) ?? [];
  switch (scheme?.toLowerCase()) {
    case "bword":
    case "entry":
      return rest.startsWith("#")
        ? fragment(rest.slice(1))
        : lookup(decode(rest.split("#")[0] ?? ""));
    case "sound":
      return rest ? { kind: "sound", path: decode(rest) } : none;
    case "http":
    case "https":
      return external(trimmed);
    default:
      return none;
  }
}

function lookup(term: string | null): LinkTarget {
  return term?.trim() ? { kind: "lookup", term: term.trim() } : none;
}

function fragment(id: string): LinkTarget {
  return id ? { kind: "fragment", id: decode(id) } : none;
}

function external(url: string): LinkTarget {
  return URL.canParse(url)
    ? { kind: "external", url: new URL(url).href }
    : none;
}

function decode(text: string): string {
  try {
    return decodeURIComponent(text);
  } catch {
    return text;
  }
}
