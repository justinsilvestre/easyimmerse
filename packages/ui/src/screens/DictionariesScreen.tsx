import { useListDictionariesQuery } from "@easyimmerse/backend";
import {
  actions,
  selectDictionaryImport,
  selectDictionaryRemovalQuestion,
  selectRemovingDictionaryIds,
} from "@easyimmerse/state";
import { DictionariesView } from "../dictionaries/DictionariesView.tsx";
import { useAppDispatch } from "../hooks/useAppDispatch.ts";
import { useAppSelector } from "../hooks/useAppSelector.ts";

/** The dictionaries settings, backed by the dictionaries the server keeps. */
export function DictionariesScreen({ onBack }: { onBack: () => void }) {
  const dispatch = useAppDispatch();
  const list = useListDictionariesQuery();
  const dictionaries = list.data?.dictionaries ?? [];
  const imports = useAppSelector(selectDictionaryImport);
  const askingId = useAppSelector(selectDictionaryRemovalQuestion);
  const dismissAlert = () => dispatch(actions.dictionaryImportAlertDismissed());
  return (
    <DictionariesView
      dictionaries={dictionaries}
      removingIds={useAppSelector(selectRemovingDictionaryIds)}
      confirmingRemovalOf={
        dictionaries.find(({ id }) => id === askingId) ?? null
      }
      isLoading={list.isLoading}
      loadFailed={list.isError}
      addingFile={imports.addingFile}
      importProgress={imports.progress}
      unsupportedFile={imports.unsupportedFile}
      importFailure={imports.importFailure}
      pendingTable={imports.pendingTable}
      onBack={onBack}
      onAddFromFile={() => dispatch(actions.dictionaryFilePickRequested())}
      onRemove={(dictionaryId) =>
        dispatch(actions.dictionaryRemovalRequested(dictionaryId))
      }
      onConfirmRemoval={() => dispatch(actions.dictionaryRemovalConfirmed())}
      onCancelRemoval={() => dispatch(actions.dictionaryRemovalCancelled())}
      onDismissUnsupportedFile={dismissAlert}
      onDismissImportFailure={dismissAlert}
      onTableColumnRoleChosen={(index, role) =>
        dispatch(actions.dictionaryColumnRoleChosen(index, role))
      }
      onTableHeaderRowToggled={() =>
        dispatch(actions.dictionaryHeaderRowToggled())
      }
      onImportTable={() => dispatch(actions.dictionaryColumnsConfirmed())}
      onCancelTable={() => dispatch(actions.dictionaryColumnsCancelled())}
    />
  );
}
