import type { LicenseNoticeGroup } from "@easyimmerse/licenses";
import type { QueryReturnValue } from "@reduxjs/toolkit/query";
import type { BackendError } from "./backendClient.ts";

/** The failure for notices that could not be loaded, such as a bundle chunk that did not download. */
const licenseNoticesUnloadable: BackendError = {
  status: "NETWORK",
  code: "licenseNoticesUnloadable",
  message: "The license notices could not be loaded.",
};

/** Loads the bundled license notices, answering a failure to load them with a client error. */
export function loadNotices(
  load: () => Promise<LicenseNoticeGroup[]>,
): Promise<QueryReturnValue<LicenseNoticeGroup[], BackendError, undefined>> {
  return load().then(
    (groups) => ({ data: groups }),
    () => ({ error: licenseNoticesUnloadable }),
  );
}
