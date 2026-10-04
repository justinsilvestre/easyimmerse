import type { BackendError } from "@easyimmerse/backend";
import {
  useClearConversionCacheMutation,
  useGetConversionCacheStatusQuery,
} from "@easyimmerse/backend";
import type { ConversionCacheStatus } from "@easyimmerse/types";
import { useState } from "react";
import type {
  ConversionCacheControls,
  ConversionCacheView,
} from "../components/ConversionCacheSection.tsx";

/** Reads the converted videos' disk usage and clears them on request. */
export function useConversionCacheControls(): ConversionCacheControls {
  const { data, error } = useGetConversionCacheStatusQuery();
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
  return { cache: toCacheView(data, error), onClear, clearStatus };
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
