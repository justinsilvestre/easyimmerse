import type { Feature } from "../app/feature.ts";

/** Whether the native shell runs on a desktop or on a phone. */
export type NativePlatform = "desktop" | "mobile";

/** The address of the easyImmerse server the app talks to, and the token it sends with each request. */
export type ServerConfig = {
  serverUrl: string;
  token: string;
  /** The native app that runs this server inside itself, or absent for a server reached over the network. */
  bundledIn?: NativePlatform;
};

/** The server slice of the app state. Both fields are set when the store is created and never change. */
export type ServerState = {
  /** The server the app talks to, or null when the app runs offline. */
  config: ServerConfig | null;
  /** The address of the official easyImmerse server, which a person may log in to, or null while the app knows of none. */
  cloudUrl: string | null;
};

/** The server as a feature. It handles no action; the store seeds its state when it is created. */
export const serverFeature: Feature<ServerState> = {
  initialState: { config: null, cloudUrl: null },
  update: (server) => [server, []],
};
