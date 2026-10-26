/** How the address bar takes a new address: as a new entry of the browser's history, or in place of the current entry. */
export type LocationWrite = "push" | "replace";

/** What the route asks of the platform: to show the path and query of where the app now is. */
export type RouteEffect = {
  type: "writeLocation";
  path: string;
  write: LocationWrite;
};
