import type { MediaAvailabilityResponse } from "@easyimmerse/types";
import type { PathAvailabilities } from "./mediaIssueOf.ts";

/** What the server reported for each media file at a path, empty until its answer arrives. */
export function pathAvailabilitiesOf(
  response: MediaAvailabilityResponse | undefined,
): PathAvailabilities {
  return new Map(
    response?.media_files.map(({ media_id, availability }) => [
      media_id,
      availability,
    ]),
  );
}
