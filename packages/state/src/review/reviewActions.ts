import type { ReviewHoldKind, ReviewRating } from "@easyimmerse/types";

/**
 * The action creators of the review screen. The review opens with the `openReview` navigation step and closes with any step away from it;
 * the queue arriving or failing, and each answer and undo landing, are the `requestSettled` of their requests.
 * `atMs` is when the user acted, which times how long a card was looked at.
 */
export const reviewActions = {
  /** The user asked to see the back of the card shown. */
  reviewAnswerShown: (atMs: number) =>
    ({ type: "reviewAnswerShown", atMs }) as const,
  /** The user rated the card shown, once its back was shown. */
  reviewRated: (rating: ReviewRating, atMs: number) =>
    ({ type: "reviewRated", rating, atMs }) as const,
  /** The user asked to take back the latest step of the session: a rating, or setting a card aside. */
  reviewUndoRequested: () => ({ type: "reviewUndoRequested" }) as const,
  /** The user asked to hear the audio of the card shown again. */
  reviewAudioReplayed: () => ({ type: "reviewAudioReplayed" }) as const,
  /** The user asked for twenty more new cards today, from the end of the session. */
  reviewAllowanceRaised: () => ({ type: "reviewAllowanceRaised" }) as const,
  /** The user asked, at the end of the session, to review today as many of the reviews the day's limit left for later days. */
  reviewMoreReviewsRequested: (reviewCount: number) =>
    ({ type: "reviewMoreReviewsRequested", reviewCount }) as const,
  /** The user asked, from the project, to review today as many of the reviews the day's limit left for later days. */
  projectReviewMoreRequested: (projectId: string, reviewCount: number) =>
    ({ type: "projectReviewMoreRequested", projectId, reviewCount }) as const,
  /** The user set the card shown aside: buried it until tomorrow, or suspended it. */
  reviewCardHeld: (hold: ReviewHoldKind, atMs: number) =>
    ({ type: "reviewCardHeld", hold, atMs }) as const,
  /** The user asked to see the shown card's screenshot at full size. */
  reviewScreenshotExpanded: () =>
    ({ type: "reviewScreenshotExpanded" }) as const,
  reviewScreenshotClosed: () => ({ type: "reviewScreenshotClosed" }) as const,
  /** The user asked to load the session's cards again after they failed to load. */
  reviewQueueRetried: () => ({ type: "reviewQueueRetried" }) as const,
  /** The user asked to edit the card shown, which opens it in the editor on the screen of the media file it was made from. */
  reviewFlashcardEditRequested: (mediaFileId: string) =>
    ({ type: "reviewFlashcardEditRequested", mediaFileId }) as const,
  /** The user asked to delete the card shown, which asks first. */
  reviewFlashcardDeleteRequested: () =>
    ({ type: "reviewFlashcardDeleteRequested" }) as const,
  reviewFlashcardDeleteCancelled: () =>
    ({ type: "reviewFlashcardDeleteCancelled" }) as const,
  reviewFlashcardDeleteConfirmed: (atMs: number) =>
    ({ type: "reviewFlashcardDeleteConfirmed", atMs }) as const,
};

/** An action of the review screen. */
export type ReviewAction = ReturnType<
  (typeof reviewActions)[keyof typeof reviewActions]
>;
