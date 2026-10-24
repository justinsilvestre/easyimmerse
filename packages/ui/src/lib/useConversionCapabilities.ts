import { useGetConversionCapabilitiesQuery } from "@easyimmerse/backend";

/** How often the capabilities are asked for again while the server still looks for a video encoder. */
const discoveryPollingMs = 2000;

/**
 * Reads what the server's media conversion can do, asking again every two seconds while it still looks for a video encoder.
 * Reads nothing while `skip` is true. Returns the query's result.
 */
export function useConversionCapabilities(skip: boolean) {
  const result = useGetConversionCapabilitiesQuery(undefined, { skip });
  const isDiscovering = result.data?.encoder_discovery_finished === false;
  useGetConversionCapabilitiesQuery(undefined, {
    skip: skip || !isDiscovering,
    pollingInterval: discoveryPollingMs,
  });
  return result;
}
