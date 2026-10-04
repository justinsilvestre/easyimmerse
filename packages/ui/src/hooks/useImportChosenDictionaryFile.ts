import type { BackendError } from "@easyimmerse/backend";
import {
  useImportDictionaryMutation,
  useImportLocalDictionaryMutation,
} from "@easyimmerse/backend";
import type { AppState } from "@easyimmerse/state";
import { actions, selectChosenDictionaryFile } from "@easyimmerse/state";
import { useEffect, useRef } from "react";
import { useAppDispatch } from "./useAppDispatch.ts";
import { useAppSelector } from "./useAppSelector.ts";

type ChosenDictionaryFile = NonNullable<AppState["chosenDictionaryFile"]>;

/**
 * Imports the dictionary file the user picked under the languages they chose: its bytes when
 * the browser read it, or its path when the server can read it from disk.
 */
export function useImportChosenDictionaryFile(): void {
  const dispatch = useAppDispatch();
  const chosen = useAppSelector(selectChosenDictionaryFile);
  const [importDictionary] = useImportDictionaryMutation();
  const [importLocalDictionary] = useImportLocalDictionaryMutation();
  // Strict mode runs effects twice, and the same chosen file must be sent only once.
  const sent = useRef<ChosenDictionaryFile | null>(null);
  useEffect(() => {
    if (chosen === null || sent.current === chosen) return;
    sent.current = chosen;
    const { file, languages } = chosen;
    const request =
      file.source.kind === "bytes"
        ? importDictionary({ bytes: file.source.bytes, ...languages })
        : importLocalDictionary({
            path: file.source.path,
            source_language: languages.sourceLanguage,
            target_language: languages.targetLanguage,
          });
    request
      .unwrap()
      .then(() => dispatch(actions.dictionaryFileImported()))
      .catch((error: BackendError) =>
        dispatch(
          isUnsupportedFormat(error)
            ? actions.dictionaryFileUnsupported(file.name)
            : actions.dictionaryFileImportFailed(),
        ),
      );
  }, [chosen, importDictionary, importLocalDictionary, dispatch]);
}

function isUnsupportedFormat(error: BackendError): boolean {
  if (error.code !== undefined) return error.code === "unsupported_format";
  return error.status === 400;
}
