import type {
  Flashcard,
  FlashcardContent,
  ReviewAnswerRequest,
  ReviewAnswerResponse,
  ReviewIntervals,
  ReviewQueue,
  ReviewSummary,
} from "@easyimmerse/types";

const minuteMs = 60 * 1000;
const dayMs = 24 * 60 * minuteMs;

/** The intervals of a card answered for the first time, as FSRS gives them before fuzz. */
const firstIntervals: ReviewIntervals = {
  again_ms: 10 * minuteMs,
  hard_ms: dayMs,
  good_ms: 2 * dayMs,
  easy_ms: 8 * dayMs,
};

function content(
  word: string,
  sentence: string,
  translation: string,
): FlashcardContent {
  return {
    word,
    word_pronunciation: "",
    l1_definition: "",
    l2_definition: "",
    text_context: sentence,
    text_context_translation: translation,
    text_context_pronunciation: "",
    audio_context: null,
    screenshot: null,
    tags: [],
  };
}

function flashcardOf(
  id: string,
  word: string,
  sentence: string,
  translation: string,
): Flashcard {
  return {
    id,
    project_id: "p1",
    media_file_id: "m1",
    cue_index: null,
    word_start: null,
    content: content(word, sentence, translation),
    included_fields: ["word", "text_context", "text_context_translation"],
    created_at_ms: 1767225600000,
    updated_at_ms: 1767225600000,
    exported_at_ms: null,
    was_packaged: false,
    sent_at_ms: null,
    is_suspended: false,
  };
}

/** Three new cards of project `p1`, the queue of its first review session. */
export const fixtureReviewQueue: ReviewQueue = {
  cards: [
    flashcardOf("r1", "Katze", "Die Katze schläft.", "The cat is sleeping."),
    flashcardOf(
      "r2",
      "Hund",
      "Der Hund will fressen.",
      "The dog wants to eat.",
    ),
    flashcardOf("r3", "ruhig", "Alles ist ruhig.", "Everything is quiet."),
  ].map((flashcard) => ({ flashcard, state: null, intervals: firstIntervals })),
};

/** The summary of the review of project `p1` before any card was answered. */
export const fixtureReviewSummary: ReviewSummary = {
  due_count: 0,
  learning_count: 0,
  new_count: 3,
  held_back_count: 0,
  next_due_at_ms: null,
  next_card: fixtureReviewQueue.cards[0]?.flashcard ?? null,
  has_progress: false,
};

/** Answers a rating as the server would for a new card rated Good or better: under review, due in two days. */
export function answerReviewFixture(
  request: ReviewAnswerRequest,
  answeredAtMs: number,
): ReviewAnswerResponse {
  const state = {
    state: "review",
    due_at_ms: answeredAtMs + 2 * dayMs,
    stability: 2,
    difficulty: 5,
    interval_ms: 2 * dayMs,
    reps: 1,
    lapses: 0,
    learning_step: 0,
    last_reviewed_at_ms: answeredAtMs,
    is_leech: false,
  } as const;
  return {
    state,
    entry: {
      flashcard_id: request.flashcard_id,
      answered_at_ms: answeredAtMs,
      rating: request.rating,
      kind: "learning",
      state: "review",
      elapsed_ms: 0,
      duration_ms: request.duration_ms,
      stability: 2,
      difficulty: 5,
      interval_ms_before: 0,
      interval_ms_after: 2 * dayMs,
      desired_retention: 0.9,
    },
    intervals: firstIntervals,
  };
}
