/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** The address of the official easyImmerse server, which the app offers to log in to. Unset while there is none. */
  readonly VITE_EASYIMMERSE_CLOUD_URL?: string;
}

interface Window {
  /** Installed by the Redux DevTools browser extension, which composes the store's enhancers with its own. */
  __REDUX_DEVTOOLS_EXTENSION_COMPOSE__?: import("@easyimmerse/state").EnhancerComposer;
}
