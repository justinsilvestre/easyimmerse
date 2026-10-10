import type { AppState } from "../app/appState.ts";
import type { FlashcardOutbox } from "./flashcardRequests.ts";

/** What the flashcards feature's rules read and write as they run: the state before the action, and the outbox they fill. */
export type FlashcardsContext = { app: AppState; outbox: FlashcardOutbox };
