import {
  useDeleteDictionaryMutation,
  useListDictionariesQuery,
  useListProjectsQuery,
  useMoveDictionaryMutation,
  useSetDictionaryEnabledMutation,
} from "@easyimmerse/backend";
import type { DictionaryLanguages } from "@easyimmerse/state";
import { actions, selectUnsupportedDictionaryFile } from "@easyimmerse/state";
import { useState } from "react";
import { DictionariesView } from "../dictionaries/DictionariesView.tsx";
import { DictionaryFileDialog } from "../dictionaries/DictionaryFileDialog.tsx";
import { DictionaryRegistryDialog } from "../dictionaries/DictionaryRegistryDialog.tsx";
import { useAppDispatch } from "../hooks/useAppDispatch.ts";
import { useAppSelector } from "../hooks/useAppSelector.ts";
import { useImportChosenDictionaryFile } from "../hooks/useImportChosenDictionaryFile.ts";
import { defaultProjectSettings } from "../projects/defaultProjectSettings.ts";
import { ScreenMessage } from "./ScreenMessage.tsx";

/** The dictionaries the server holds, with the ways to reorder, disable, remove, and add them. */
export function DictionariesScreen({ onBack }: { onBack: () => void }) {
  const dispatch = useAppDispatch();
  const { data, isLoading } = useListDictionariesQuery();
  const unsupportedFile = useAppSelector(selectUnsupportedDictionaryFile);
  const [openDialog, setOpenDialog] = useState<"registry" | "file" | null>(
    null,
  );
  const changes = useDictionaryChanges();
  useImportChosenDictionaryFile();
  if (isLoading)
    return (
      <ScreenMessage
        status="loading"
        message="Loading the dictionaries…"
        onBack={onBack}
      />
    );
  if (!data)
    return (
      <ScreenMessage
        status="failed"
        message="Could not load the dictionaries."
        onBack={onBack}
      />
    );
  const closeDialog = () => setOpenDialog(null);
  return (
    <>
      <DictionariesView
        dictionaries={data.dictionaries}
        unsupportedFile={unsupportedFile}
        onBack={onBack}
        onAddFromRegistry={() => setOpenDialog("registry")}
        onAddFromFile={() => setOpenDialog("file")}
        onToggle={(dictionaryId) => {
          const dictionary = data.dictionaries.find(
            (candidate) => candidate.id === dictionaryId,
          );
          if (dictionary)
            changes.setEnabled(dictionaryId, !dictionary.is_enabled);
        }}
        onMove={changes.move}
        onRemove={changes.remove}
        onDismissUnsupportedFile={() =>
          dispatch(actions.unsupportedDictionaryFileDismissed())
        }
      />
      {openDialog === "registry" && <RegistryDialog onClose={closeDialog} />}
      {openDialog === "file" && (
        <FileDialog
          onChooseFile={(languages) => {
            closeDialog();
            dispatch(actions.dictionaryFilePickRequested(languages));
          }}
          onClose={closeDialog}
        />
      )}
    </>
  );
}

/** The changes to existing dictionaries, each reported with a notification when it fails. */
function useDictionaryChanges() {
  const dispatch = useAppDispatch();
  const [setDictionaryEnabled] = useSetDictionaryEnabledMutation();
  const [moveDictionary] = useMoveDictionaryMutation();
  const [deleteDictionary] = useDeleteDictionaryMutation();
  const notifyOnFailure = (request: { unwrap: () => Promise<unknown> }) =>
    request
      .unwrap()
      .catch(() =>
        dispatch(
          actions.notificationRequested("The dictionary could not be changed"),
        ),
      );
  return {
    setEnabled: (dictionaryId: string, isEnabled: boolean) =>
      notifyOnFailure(setDictionaryEnabled({ dictionaryId, isEnabled })),
    move: (dictionaryId: string, direction: "up" | "down") =>
      notifyOnFailure(moveDictionary({ dictionaryId, direction })),
    remove: (dictionaryId: string) =>
      notifyOnFailure(deleteDictionary(dictionaryId)),
  };
}

/** The registry dialog. No registry server exists yet, so it offers no dictionaries. */
function RegistryDialog({ onClose }: { onClose: () => void }) {
  const [languageFilter, setLanguageFilter] = useState("");
  return (
    <DictionaryRegistryDialog
      entries={[]}
      languageFilter={languageFilter}
      onLanguageFilterChange={setLanguageFilter}
      onInstall={() => undefined}
      onClose={onClose}
    />
  );
}

/** The file dialog, starting from the languages of the most recently opened project. */
function FileDialog({
  onChooseFile,
  onClose,
}: {
  onChooseFile: (languages: DictionaryLanguages) => void;
  onClose: () => void;
}) {
  const { data, isLoading } = useListProjectsQuery();
  // The dialog keeps its own state from its initial languages, so it opens once they are known.
  if (isLoading) return null;
  const recent =
    data?.projects[0] ?? defaultProjectSettings(navigator.language);
  return (
    <DictionaryFileDialog
      initialLanguages={{
        sourceLanguage: recent.target_language,
        targetLanguage: recent.translation_language,
      }}
      onChooseFile={onChooseFile}
      onClose={onClose}
    />
  );
}
