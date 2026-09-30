import type { BaseQueryFn } from "@reduxjs/toolkit/query";
import type { BackendError, BackendRequest } from "./backendClient.ts";
import { getBackendClient } from "./configureBackend.ts";

/** The RTK Query base query. It delegates to whichever client the app configured. */
export const injectedBaseQuery: BaseQueryFn<
  BackendRequest,
  unknown,
  BackendError
> = (request) => getBackendClient().send(request);
