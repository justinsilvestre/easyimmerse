import { actions } from "@easyimmerse/state";
import {
  createContext,
  type ReactNode,
  useContext,
  useEffect,
  useState,
} from "react";
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
  const [store] = useState(() => given ?? createUnsavedCardStore());
  useCountAsUnsavedWork(store);
  return <UnsavedCardsContext value={store}>{children}</UnsavedCardsContext>;
}

/** The app's list of unsaved flashcards, or, outside a provider, a list of the component's own that nothing shows. */
export function useUnsavedCards(): UnsavedCardStore {
  const shared = useContext(UnsavedCardsContext);
  const [own] = useState(() => createUnsavedCardStore());
  return shared ?? own;
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
