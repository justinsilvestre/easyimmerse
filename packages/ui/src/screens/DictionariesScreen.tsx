import {
  useDeleteDictionaryMutation,
  useListDictionariesQuery,
} from "@easyimmerse/backend";
import {
  actions,
  selectDictionaryImport,
  transientNotice,
} from "@easyimmerse/state";
import { useState } from "react";
import { DictionariesView } from "../dictionaries/DictionariesView.tsx";
import { useAppDispatch } from "../hooks/useAppDispatch.ts";
import { useAppSelector } from "../hooks/useAppSelector.ts";

/** The dictionaries settings, backed by the dictionaries the server keeps. */
export function DictionariesScreen({ onBack }: { onBack: () => void }) {
  const dispatch = useAppDispatch();
  const list = useListDictionariesQuery();
  const [deleteDictionary] = useDeleteDictionaryMutation();
  const imports = useAppSelector(selectDictionaryImport);
  const [removingIds, setRemovingIds] = useState<readonly string[]>([]);
  const remove = (dictionaryId: string) => {
    setRemovingIds((ids) => [...ids, dictionaryId]);
    deleteDictionary(dictionaryId)
      .unwrap()
      .catch(() => {
        setRemovingIds((ids) => ids.filter((id) => id !== dictionaryId));
        dispatch(
          actions.noticeRequested(
            transientNotice("danger", "The dictionary could not be removed"),
          ),
        );
      });
  };
  const dismissAlert = () => dispatch(actions.dictionaryImportAlertDismissed());
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
      onDismissUnsupportedFile={dismissAlert}
      onDismissImportFailure={dismissAlert}
      onImportTable={(layout) =>
        dispatch(actions.dictionaryColumnsChosen(layout))
      }
      onCancelTable={() => dispatch(actions.dictionaryColumnsCancelled())}
    />
  );
}
