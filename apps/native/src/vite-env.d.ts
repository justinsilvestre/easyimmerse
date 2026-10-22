/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** The address of the official easyImmerse server, which the app offers to log in to. Unset while there is none. */
  readonly VITE_EASYIMMERSE_CLOUD_URL?: string;
}
