import type { BrowserFileRegistry } from "@easyimmerse/state";
import type { BaseQueryFn } from "@reduxjs/toolkit/query";
import type { AnkiConnect } from "./ankiConnect.ts";
import type {
  BackendClient,
  BackendError,
  BackendRequest,
} from "./backendClient.ts";
import type { FailedPassages } from "./failedPassages.ts";
import type { FrameCapturer } from "./frameCapturer.ts";
import type { ServerFetch } from "./serverFetch.ts";

/** What the backend's thunk middleware passes to every thunk and base query as their extra argument. */
export type BackendThunkExtra = {
  client: BackendClient;
  /** The files a browser picked, on the platforms that hold any. */
  browserFileRegistry: BrowserFileRegistry<File> | null;
  /** Draws frames from the files a browser picked, on the platforms that hold any. */
  frameCapturer: FrameCapturer | null;
  /** The passages whose prefetched batch failed lately in this store. */
  failedPassages: FailedPassages;
  /** Fetches the server's answers that are not JSON, such as media and packages; null when the app has no server. */
  serverFetch: ServerFetch | null;
  /** Sends actions to Anki through AnkiConnect. */
  ankiConnect: AnkiConnect;
};

/** The RTK Query base query. It sends each request through the client the store was created with. */
export const injectedBaseQuery: BaseQueryFn<
  BackendRequest,
  unknown,
  BackendError
> = (request, api) =>
  (api.extra as BackendThunkExtra).client.send(request, api.signal);
