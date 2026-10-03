/// <reference types="vite/client" />

interface Window {
  /** Installed by the Redux DevTools browser extension, which composes the store's enhancers with its own. */
  __REDUX_DEVTOOLS_EXTENSION_COMPOSE__?: import("@easyimmerse/state").EnhancerComposer;
}
