import type { BackendError } from "@easyimmerse/backend";
import type { ConversionCacheStatus } from "@easyimmerse/types";
import type { ConversionCacheView } from "./ConversionCacheSection.tsx";

/**
 * Returns what the Settings screen shows about the media cache, from its status query.
 * An app without a server, or a server without a conversion service, has no cache to show.
 * The error is a backend error, or the serialized exception RTK Query reports instead.
 */
export function conversionCacheViewOf(
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
