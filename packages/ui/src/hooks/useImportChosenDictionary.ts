import {
  skipToken,
  useGetProjectQuery,
  useImportDictionaryMutation,
  useImportLocalDictionaryMutation,
  useSetDictionaryLanguagesMutation,
} from "@easyimmerse/backend";
import type { ChosenFile } from "@easyimmerse/state";
import { actions, selectScreen } from "@easyimmerse/state";
import type { DictionarySummary, ProjectSettings } from "@easyimmerse/types";
import { useAppDispatch } from "./useAppDispatch.ts";
import { useAppSelector } from "./useAppSelector.ts";
import type { ChosenFileHandler } from "./useChosenFileHandler.ts";

/**
 * Returns a handler that imports a chosen dictionary: by path on disk, or from the bytes of a file the browser stored.
 * A dictionary that declares no languages takes those of the open project, so that the project counts it as its own.
 */
export function useImportChosenDictionary(): ChosenFileHandler {
  const dispatch = useAppDispatch();
  const settings = useOpenProjectSettings();
  const importDictionary = useImportDictionary();
  const [setDictionaryLanguages] = useSetDictionaryLanguagesMutation();
  return async (chosen) => {
    dispatch(actions.notificationRequested(`Importing ${chosen.file.name}…`));
    let dictionary = await importDictionary(chosen);
    if (settings && hasNoLanguages(dictionary))
      dictionary = await setDictionaryLanguages({
        id: dictionary.id,
        languages: {
          source_language: settings.target_language,
          target_language: settings.translation_language,
        },
      }).unwrap();
    dispatch(
      actions.notificationRequested(`Dictionary added: ${dictionary.title}`),
    );
  };
}

function useImportDictionary() {
  const [importFromBytes] = useImportDictionaryMutation();
  const [importFromPath] = useImportLocalDictionaryMutation();
  return ({ file, bytes }: ChosenFile): Promise<DictionarySummary> => {
    if (file.source.kind === "path")
      return importFromPath({ path: file.source.path }).unwrap();
    if (bytes === null) throw new Error("The file has not been read yet.");
    return importFromBytes({ bytes }).unwrap();
  };
}

function useOpenProjectSettings(): ProjectSettings | undefined {
  const screen = useAppSelector(selectScreen);
  const projectId =
    screen.kind === "project" || screen.kind === "media"
      ? screen.projectId
      : skipToken;
  return useGetProjectQuery(projectId).data?.settings;
}

function hasNoLanguages(dictionary: DictionarySummary): boolean {
  return (
    dictionary.source_language === null && dictionary.target_language === null
  );
}
