import type { BackendError } from "@easyimmerse/backend";
import {
  useClearConversionCacheMutation,
  useGetConversionCacheStatusQuery,
  useSetConversionCacheBudgetMutation,
} from "@easyimmerse/backend";
import type { ConversionCacheStatus } from "@easyimmerse/types";
import { useState } from "react";
import type {
  ConversionCacheControls,
  ConversionCacheView,
} from "../components/ConversionCacheSection.tsx";

/** Reads the media cache's disk usage, clears it on request, and sets how large it may grow. */
export function useConversionCacheControls(): ConversionCacheControls {
  const { data, error } = useGetConversionCacheStatusQuery();
  const [clearCache] = useClearConversionCacheMutation();
  const [setBudget] = useSetConversionCacheBudgetMutation();
  const [clearStatus, setClearStatus] = useState("");
  const onClear = () => {
    setClearStatus("Clearing…");
    clearCache()
      .unwrap()
      .then(() => setClearStatus("Cleared."))
      .catch((error: { message?: string }) =>
        setClearStatus(
          error.message ?? "The media cache could not be cleared.",
        ),
      );
  };
  const onBudgetChange = (budgetBytes: number | null) => {
    setBudget({ budget_bytes: budgetBytes })
      .unwrap()
      .catch((error: { message?: string }) =>
        setClearStatus(
          error.message ?? "The cache's maximum size could not be changed.",
        ),
      );
  };
  return {
    cache: toCacheView(data, error),
    onClear,
    clearStatus,
    onBudgetChange,
  };
}

/**
 * An app without a server, or a server without a conversion service, has no cache to show.
 * The error is a backend error, or the serialized exception RTK Query reports instead.
 */
function toCacheView(
  status: ConversionCacheStatus | undefined,
  error: Partial<BackendError> | undefined,
): ConversionCacheView {
  if (status !== undefined) return { kind: "available", status };
  if (error === undefined) return { kind: "loading" };
  if (error.status === "OFFLINE" || error.code === "conversion_unavailable")
    return { kind: "unavailable" };
  return {
    kind: "failed",
    message: error.message ?? "The server did not answer.",
  };
}
