import type { CurrentPrincipal, LibraryItem } from "@easyimmerse/types";
import { libraryVideo } from "../flashcards/libraryFlashcardTestSupport.ts";
import type { ServerCacheSlice } from "../server/cacheEntry.ts";
import { serverCacheWith } from "../server/serverCacheWith.ts";
import { exampleLibraryItem } from "./libraryBrowse/exampleLibraryItem.ts";

/** An account that does not manage the library. */
export const learner = {
  kind: "account",
  user: {
    id: "u1",
    email: "learner@example.com",
    role: "library_user",
    created_at_ms: 0,
    email_confirmed_at_ms: null,
    manages_library: false,
  },
} satisfies CurrentPrincipal;

/**
 * Returns the server cache once p1 lists its media file m1 from library item i1, the item is read with the given status,
 * and the app's principal is read as the given one, added to the given cache.
 */
export function withLibraryVideoFor(
  principal: CurrentPrincipal,
  status: LibraryItem["status"],
  slice?: ServerCacheSlice,
): ServerCacheSlice {
  return serverCacheWith(
    "getCurrentPrincipal",
    "self",
    principal,
    serverCacheWith(
      "getLibraryItem",
      "i1",
      exampleLibraryItem({ status }),
      serverCacheWith(
        "listMediaFiles",
        "p1",
        { media_files: [libraryVideo] },
        slice,
      ),
    ),
  );
}
