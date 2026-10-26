const appLinkScheme = "easyimmerse:";

/**
 * Returns the path and query that an `easyimmerse://` link names, as `routeOfPath` reads them,
 * or null when the link has another scheme.
 * The link's host is the path's first segment, so `easyimmerse://projects/p1` names `/projects/p1`.
 */
export function pathOfAppLink(link: string): string | null {
  if (!link.toLowerCase().startsWith(appLinkScheme)) return null;
  const [rest = ""] = link.slice(appLinkScheme.length).split("#", 1);
  return `/${rest.replace(/^\/+/, "")}`;
}
