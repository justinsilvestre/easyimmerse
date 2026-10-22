import type { RequestFailure } from "../server/serverRequest.ts";

/** What became of the last request for another confirmation link: none yet, sent, refused as too soon, or failed. */
export type ConfirmationEmailStatus =
  | { kind: "idle" }
  | { kind: "sent" }
  | { kind: "tooSoon"; retryAfterSeconds: number | undefined }
  | { kind: "failed"; failure: RequestFailure };

export const initialConfirmationEmail: ConfirmationEmailStatus = {
  kind: "idle",
};

/** The id of the request that mails the account another confirmation link. */
export const confirmationEmailRequestId = "account/confirmationEmail";

/** The id of the request that fetches anew who the app's token belongs to. */
export const principalRefreshRequestId = "account/principal";

/** The effect that fetches anew who the app's token belongs to, as once its email address may have been confirmed. */
export const principalRefresh = {
  type: "sendRequest",
  id: principalRefreshRequestId,
  request: { kind: "getCurrentPrincipal" },
} as const;
