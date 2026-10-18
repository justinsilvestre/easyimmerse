/** The id of the request that clears the media cache, or of the one that sets its maximum size. */
export function conversionCacheRequestId(request: "clear" | "budget"): string {
  return `settings/conversionCache/${request}`;
}
