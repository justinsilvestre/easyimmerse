import { actions } from "@easyimmerse/state";
import { createContext, type ReactNode, useContext, useState } from "react";
import { useAppDispatch } from "../../hooks/useAppDispatch.ts";
import {
  createUnsavedCardStore,
  type UnsavedCardStore,
} from "./unsavedCardStore.ts";

const UnsavedCardsContext = createContext<UnsavedCardStore | null>(null);

/**
 * Gives the app one list of the flashcards that could not be saved, which outlives the screens that edit them.
 * Each listed card counts as unsaved work, so that the app warns before closing.
 */
export function UnsavedCardsProvider({
  store: given,
  children,
}: {
  /** A store to use instead of a new one, as a test that reads the list passes. */
  store?: UnsavedCardStore;
  children: ReactNode;
}) {
  const dispatch = useAppDispatch();
  const [store] = useState(
    () =>
      given ??
      createUnsavedCardStore({
        onHeld: () => dispatch(actions.unsavedWorkBegan()),
        onReleased: () => dispatch(actions.unsavedWorkEnded()),
      }),
  );
  return <UnsavedCardsContext value={store}>{children}</UnsavedCardsContext>;
}

/** The app's list of unsaved flashcards, or, outside a provider, a list of the component's own that nothing shows. */
export function useUnsavedCards(): UnsavedCardStore {
  const shared = useContext(UnsavedCardsContext);
  const [own] = useState(() => createUnsavedCardStore());
  return shared ?? own;
}
