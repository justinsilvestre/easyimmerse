import type { LibraryItemKind, LibraryItemStatus } from "@easyimmerse/types";

/** What each status tells the library manager about an item of each kind. */
const statusTexts = {
  draft: {
    video: "Learners can't see this video until you publish it.",
    audio: "Learners can't see this recording until you publish it.",
    document: "Learners can't see this text until you publish it.",
  },
  processing: {
    video:
      "The server is cutting an audio clip and taking a screenshot for each subtitle. Learners can find the video in the library once this is done.",
    audio:
      "The server is cutting an audio clip for each subtitle. Learners can find the recording in the library once this is done.",
    document:
      "The server is getting the text ready. Learners can find it in the library once this is done.",
  },
  published: {
    video:
      "Learners can find this video in the library and add it to their projects. Unpublishing it takes it away from them, but they keep the flashcards they made from it.",
    audio:
      "Learners can find this recording in the library and add it to their projects. Unpublishing it takes it away from them, but they keep the flashcards they made from it.",
    document:
      "Learners can find this text in the library and add it to their projects. Unpublishing it takes it away from them, but they keep the flashcards they made from it.",
  },
  failed: {
    video:
      "The server couldn't cut the clips and screenshots from this video, so it isn't published. Check that the video plays, replace the file if it doesn't, then publish again.",
    audio:
      "The server couldn't cut the clips from this recording, so it isn't published. Check that the recording plays, replace the file if it doesn't, then publish again.",
    document:
      "The server couldn't get this text ready, so it isn't published. Publish again, or replace the file if that doesn't help.",
  },
} satisfies Record<LibraryItemStatus["kind"], Record<LibraryItemKind, string>>;

/** Tells the library manager what an item's status means for learners, and what to do next when publishing failed. */
export function libraryStatusText(
  status: LibraryItemStatus["kind"],
  kind: LibraryItemKind,
): string {
  return statusTexts[status][kind];
}

/** What learners can no longer do with an item of each kind once it is deleted. */
const lostUses = {
  video: "watch it",
  audio: "listen to it",
  document: "read it",
} satisfies Record<LibraryItemKind, string>;

/** Tells what deleting an item of the kind does to the learners who added it. */
export function libraryDeletionText(kind: LibraryItemKind): string {
  return `Learners who added it to a project keep the flashcards they made from it, but can no longer ${lostUses[kind]}. Deleting it can't be undone.`;
}
