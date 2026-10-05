import {
  useDeleteDictionaryMutation,
  useListDictionariesQuery,
} from "@easyimmerse/backend";
import { actions } from "@easyimmerse/state";
import { DictionariesView } from "../dictionaries/DictionariesView.tsx";
import { useDictionaryImport } from "../dictionaries/useDictionaryImport.ts";
import { useAppDispatch } from "../hooks/useAppDispatch.ts";

/** The dictionaries settings, backed by the dictionaries the server keeps. */
export function DictionariesScreen({ onBack }: { onBack: () => void }) {
  const dispatch = useAppDispatch();
  const list = useListDictionariesQuery();
  const [deleteDictionary] = useDeleteDictionaryMutation();
  const imports = useDictionaryImport();
  const remove = (dictionaryId: string) =>
    deleteDictionary(dictionaryId)
      .unwrap()
      .catch(() =>
        dispatch(
          actions.notificationRequested("The dictionary could not be removed"),
        ),
      );
  return (
    <DictionariesView
      dictionaries={list.data?.dictionaries ?? []}
      isLoading={list.isLoading}
      loadFailed={list.isError}
      addingFile={imports.addingFile}
      unsupportedFile={imports.unsupportedFile}
      pendingTable={imports.pendingTable}
      onBack={onBack}
      onAddFromFile={() => dispatch(actions.dictionaryFilePickRequested())}
      onRemove={remove}
      onDismissUnsupportedFile={imports.dismissUnsupported}
      onImportTable={imports.importTable}
      onCancelTable={imports.cancelTable}
    />
  );
}
