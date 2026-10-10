import { selectReaderScreen } from "@easyimmerse/state";
import type { ComponentProps } from "react";
import { useAppDispatch } from "../hooks/useAppDispatch.ts";
import { useAppSelector } from "../hooks/useAppSelector.ts";
import { ReaderView } from "./ReaderView.tsx";
import { selectReaderLocation } from "./selectReaderLocation.ts";

/** The reader view, with its place and its state read from the store. */
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
  return (
    <ReaderView
      {...props}
      location={location}
      reader={reader}
      dispatch={dispatch}
    />
  );
}
