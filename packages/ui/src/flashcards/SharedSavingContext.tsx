import { actions } from "@easyimmerse/state";
import {
  createContext,
  type ReactNode,
  useContext,
  useEffect,
  useState,
} from "react";
import { useAppDispatch } from "../hooks/useAppDispatch.ts";
import { createSharedSaving, type SharedSaving } from "./sharedSaving.ts";
import type { UnsavedCardStore } from "./unsaved/unsavedCardStore.ts";

const SharedSavingContext = createContext<SharedSaving | null>(null);

/**
 * Gives the app the one set of flashcard-saving parts that `createSharedSaving` describes.
 * Each card listed as not saved counts as unsaved work, so that the app warns before closing.
 */
export function SharedSavingProvider({
  shared: given,
  children,
}: {
  /** The parts to use instead of new ones, as a test that reads the list of unsaved cards, or mounts screens apart, passes. */
  shared?: SharedSaving;
  children: ReactNode;
}) {
  const [shared] = useState(() => given ?? createSharedSaving());
  useCountAsUnsavedWork(shared.unsavedCards);
  return <SharedSavingContext value={shared}>{children}</SharedSavingContext>;
}

/** The app's shared flashcard-saving parts. Throws outside a `SharedSavingProvider`. */
export function useSharedSaving(): SharedSaving {
  const shared = useContext(SharedSavingContext);
  if (shared === null)
    throw new Error("Flashcard saving needs a SharedSavingProvider above it.");
  return shared;
}

/** The app's list of flashcards that could not be saved. Throws outside a `SharedSavingProvider`. */
export function useUnsavedCards(): UnsavedCardStore {
  return useSharedSaving().unsavedCards;
}

/** Counts each listed card as unsaved work, so that the app warns before closing while any is listed. */
function useCountAsUnsavedWork(store: UnsavedCardStore) {
  const dispatch = useAppDispatch();
  useEffect(() => {
    let counted = 0;
    const countListed = () => {
      const listed = store.list().length;
      for (; counted < listed; counted++) dispatch(actions.unsavedWorkBegan());
      for (; counted > listed; counted--) dispatch(actions.unsavedWorkEnded());
    };
    countListed();
    const unsubscribe = store.subscribe(countListed);
    return () => {
      unsubscribe();
      for (; counted > 0; counted--) dispatch(actions.unsavedWorkEnded());
    };
  }, [store, dispatch]);
}
