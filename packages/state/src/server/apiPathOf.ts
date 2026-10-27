/** The path under which a server serves every API route, leaving every other path to the web app's own pages. */
const apiPathPrefix = "/api";

/** Returns the path at which a server serves an API route, such as `/projects`. */
export function apiPathOf(routePath: string): string {
  return `${apiPathPrefix}${routePath}`;
}
