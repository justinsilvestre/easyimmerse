import { actions, selectDictionaryImportStatus } from "@easyimmerse/state";
import { useAppDispatch } from "../hooks/useAppDispatch.ts";
import { useAppSelector } from "../hooks/useAppSelector.ts";
import { DictionaryImportStatusButton } from "./DictionaryImportStatusButton.tsx";

/** Tells of a dictionary import under way or failed while the dictionaries page is not on top, with the way back to it. */
export function DictionaryImportStatus() {
  const dispatch = useAppDispatch();
  const status = useAppSelector(selectDictionaryImportStatus);
  if (status === null) return null;
  return (
    <DictionaryImportStatusButton
      status={status}
      onOpen={() => dispatch(actions.navigated({ type: "openDictionaries" }))}
    />
  );
}
