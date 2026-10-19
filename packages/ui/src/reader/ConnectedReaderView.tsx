import {
  selectReaderScreen,
  selectShownReaderViewMode,
} from "@easyimmerse/state";
import type { ComponentProps } from "react";
import { useAppDispatch } from "../hooks/useAppDispatch.ts";
import { useAppSelector } from "../hooks/useAppSelector.ts";
import { ReaderView } from "./ReaderView.tsx";
import { selectReaderCursor } from "./readerCursor.ts";
import { selectReaderLocation } from "./selectReaderLocation.ts";

/** The reader view, with its place, its state, the view it shows and the lookup cursor read from the store. */
export function ConnectedReaderView(
  props: Omit<
    ComponentProps<typeof ReaderView>,
    "location" | "reader" | "viewMode" | "cursor" | "dispatch"
  >,
) {
  const dispatch = useAppDispatch();
  const location = useAppSelector((state) =>
    selectReaderLocation(state, props.document, props.mediaFileId),
  );
  const reader = useAppSelector(selectReaderScreen);
  const viewMode = useAppSelector(selectShownReaderViewMode);
  const cursor = useAppSelector(selectReaderCursor);
  return (
    <ReaderView
      {...props}
      location={location}
      reader={reader}
      viewMode={viewMode}
      cursor={cursor}
      dispatch={dispatch}
    />
  );
}
