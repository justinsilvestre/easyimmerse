import {
  useClearConversionCacheMutation,
  useGetConversionCacheStatusQuery,
} from "@easyimmerse/backend";
import type { ConversionCacheStatus as ServerCacheStatus } from "@easyimmerse/types";
import { useState } from "react";
import type { ConversionCacheStatus } from "../components/ConversionCacheSection.tsx";
import type { ConversionCacheControls } from "../screens/SettingsScreen.tsx";

/**
 * Reads the converted videos' disk usage and clears them on request.
 * Without a server, or when the server has no conversion service, the status is null.
 */
export function useConversionCacheControls(): ConversionCacheControls {
  const { data } = useGetConversionCacheStatusQuery();
  const [clearCache] = useClearConversionCacheMutation();
  const [clearStatus, setClearStatus] = useState("");
  const onClear = () => {
    setClearStatus("Clearing…");
    clearCache()
      .unwrap()
      .then(() => setClearStatus("Cleared."))
      .catch((error: { message?: string }) =>
        setClearStatus(
          error.message ?? "The converted videos could not be cleared.",
        ),
      );
  };
  return {
    status: data === undefined ? null : toSectionStatus(data),
    onClear,
    clearStatus,
  };
}

function toSectionStatus(status: ServerCacheStatus): ConversionCacheStatus {
  return {
    usageBytes: status.usage_bytes,
    limitBytes: status.limit_bytes,
    budgetBytes: status.budget_bytes,
    freeBytes: status.free_bytes,
    spaceLow: status.space_low,
  };
}
