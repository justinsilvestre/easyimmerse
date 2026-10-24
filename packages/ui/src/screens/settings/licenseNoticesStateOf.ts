import type { LicenseNoticeGroup } from "@easyimmerse/licenses";
import type { LicenseNoticesState } from "./LicensesPage.tsx";

/** The licenses page's view of the license notices query. */
export function licenseNoticesStateOf(query: {
  data?: readonly LicenseNoticeGroup[];
  isError: boolean;
}): LicenseNoticesState {
  if (query.data) return { status: "loaded", groups: query.data };
  return query.isError ? { status: "failed" } : { status: "loading" };
}
