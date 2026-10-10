import type { Feature } from "../app/feature.ts";

/** The address of the easyImmerse server the app talks to, and the token it sends with each request. */
export type ServerConfig = { serverUrl: string; token: string };

export type ServerState = {
  /** The server the app talks to, or null when the app runs offline. It is set when the store is created and never changes. */
  config: ServerConfig | null;
};

/** The server as a feature. It handles no action; the store seeds its state when it is created. */
export const serverFeature: Feature<ServerState> = {
  initialState: { config: null },
  update: (server) => [server, []],
};
