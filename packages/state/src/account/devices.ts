import type { RequestFailure } from "../server/serverRequest.ts";

/** What the person is doing to the devices their account is logged in on. The devices themselves come from the server. */
export type DevicesState = {
  /** Why logging out another device failed last, until the person tries again. */
  logOutFailure: RequestFailure | null;
};

export const initialDevices: DevicesState = { logOutFailure: null };

/** The id of the request that logs the account out on a device. */
export const deleteSessionRequestId = (sessionId: string) =>
  `account/sessions/delete/${sessionId}`;
