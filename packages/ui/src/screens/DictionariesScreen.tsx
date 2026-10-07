import {
  useDeleteDictionaryMutation,
  useListDictionariesQuery,
} from "@easyimmerse/backend";
import { actions } from "@easyimmerse/state";
import { useState } from "react";
import { DictionariesView } from "../dictionaries/DictionariesView.tsx";
import { useDictionaryImport } from "../dictionaries/useDictionaryImport.ts";
import { useAppDispatch } from "../hooks/useAppDispatch.ts";

/** The dictionaries settings, backed by the dictionaries the server keeps. */
export function DictionariesScreen({ onBack }: { onBack: () => void }) {
  const dispatch = useAppDispatch();
  const list = useListDictionariesQuery();
  const [deleteDictionary] = useDeleteDictionaryMutation();
  const imports = useDictionaryImport();
  const [removingIds, setRemovingIds] = useState<readonly string[]>([]);
  const remove = (dictionaryId: string) => {
    setRemovingIds((ids) => [...ids, dictionaryId]);
    deleteDictionary(dictionaryId)
      .unwrap()
      .catch(() => {
        setRemovingIds((ids) => ids.filter((id) => id !== dictionaryId));
        dispatch(
          actions.notificationRequested("The dictionary could not be removed"),
        );
      });
  };
  return (
    <DictionariesView
      dictionaries={list.data?.dictionaries ?? []}
      removingIds={removingIds}
      isLoading={list.isLoading}
      loadFailed={list.isError}
      addingFile={imports.addingFile}
      importProgress={imports.progress}
      unsupportedFile={imports.unsupportedFile}
      importFailure={imports.importFailure}
      pendingTable={imports.pendingTable}
      onBack={onBack}
      onAddFromFile={() => dispatch(actions.dictionaryFilePickRequested())}
      onRemove={remove}
      onDismissUnsupportedFile={imports.dismissUnsupported}
      onDismissImportFailure={imports.dismissFailure}
      onImportTable={imports.importTable}
      onCancelTable={imports.cancelTable}
    />
  );
}
