import { loadLicenseNoticeGroups } from "@easyimmerse/licenses";
import { useEffect, useState } from "react";
import type { LicenseNoticesState } from "../components/LicensesPage.tsx";

/** Loads the license notices once the component that shows them mounts. */
export function useLicenseNotices(
  load: typeof loadLicenseNoticeGroups = loadLicenseNoticeGroups,
): LicenseNoticesState {
  const [notices, setNotices] = useState<LicenseNoticesState>({
    status: "loading",
  });
  useEffect(() => {
    let isCurrent = true;
    load().then(
      (groups) => isCurrent && setNotices({ status: "loaded", groups }),
      () => isCurrent && setNotices({ status: "failed" }),
    );
    return () => {
      isCurrent = false;
    };
  }, [load]);
  return notices;
}
