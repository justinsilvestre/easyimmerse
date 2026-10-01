import type { ServerStoreParts } from "@easyimmerse/state";
import type { Middleware } from "redux";
import { thunk } from "redux-thunk";
import { backendApi } from "./backendApi.ts";

/**
 * Chains the thunk middleware in front of the RTK Query middleware. The app store is built
 * by hand without Redux Toolkit's defaults, and RTK Query's hooks dispatch thunks.
 */
const middleware: Middleware = (api) => (next) =>
  thunk(api)(backendApi.middleware(api)(next));

/** The reducer and middleware that the app store mounts for server data. */
export const backendStoreParts: ServerStoreParts = {
  reducerPath: backendApi.reducerPath,
  reducer: backendApi.reducer,
  middleware,
};
