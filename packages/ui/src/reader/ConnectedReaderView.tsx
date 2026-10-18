import { actions, selectReaderScreen } from "@easyimmerse/state";
import { type ComponentProps, useEffect } from "react";
import { useAppDispatch } from "../hooks/useAppDispatch.ts";
import { useAppSelector } from "../hooks/useAppSelector.ts";
import { ReaderView } from "./ReaderView.tsx";
import { translationStatusOf } from "./readerTranslation.ts";
import { selectReaderLocation } from "./selectReaderLocation.ts";

/**
 * The reader view, with its place and its state read from the store.
 * It reports to the store how far the translation is ready, so that the store knows which view is shown, as its keys need.
 */
export function ConnectedReaderView(
  props: Omit<
    ComponentProps<typeof ReaderView>,
    "location" | "reader" | "dispatch"
  >,
) {
  const dispatch = useAppDispatch();
  const location = useAppSelector((state) =>
    selectReaderLocation(state, props.document, props.mediaFileId),
  );
  const reader = useAppSelector(selectReaderScreen);
  const translationStatus = translationStatusOf(props.translation);
  useEffect(() => {
    dispatch(actions.readerTranslationStatusReported(translationStatus));
  }, [dispatch, translationStatus]);
  return (
    <ReaderView
      {...props}
      location={location}
      reader={reader}
      dispatch={dispatch}
    />
  );
}
