import { actions, selectReaderKeyBinding } from "@easyimmerse/state";
import { useAppDispatch } from "../hooks/useAppDispatch.ts";
import { useKeyBindings } from "../hooks/useKeyBindings.ts";
import { type ReaderControls, useReaderControls } from "./readerControls.ts";

/**
 * Binds the reader's keys, as `selectReaderKeyBinding` in the state package describes,
 * and returns the controls to give the reader view, through which the keys turn its pages and focus its search field.
 */
export function useReaderKeyBindings(): ReaderControls {
  const dispatch = useAppDispatch();
  const controls = useReaderControls();
  const { pageTurner, searchInput } = controls;
  useKeyBindings(selectReaderKeyBinding, {
    turnPage: ({ direction }) => pageTurner.current?.[direction](),
    openBookSearch: () => {
      dispatch(actions.readerPanelOpened("search"));
      searchInput.current?.focus();
      searchInput.current?.select();
    },
  });
  return controls;
}
