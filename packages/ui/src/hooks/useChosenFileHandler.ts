import type { ChosenFile, Screen } from "@easyimmerse/state";
import { actions, selectChosenFile, selectScreen } from "@easyimmerse/state";
import { useEffect, useRef } from "react";
import { describeBackendError } from "../describeBackendError.ts";
import { useAddChosenMedia } from "./useAddChosenMedia.ts";
import { useAddChosenSubtitles } from "./useAddChosenSubtitles.ts";
import { useAppDispatch } from "./useAppDispatch.ts";
import { useAppSelector } from "./useAppSelector.ts";
import { useImportChosenDictionary } from "./useImportChosenDictionary.ts";

/**
 * Acts on each file the user picks: adds media to the open project, adds subtitles to the open media, or imports a dictionary.
 * A dictionary stored in the browser waits until its bytes have been read.
 */
export function useChosenFileHandler() {
  const dispatch = useAppDispatch();
  const chosenFile = useAppSelector(selectChosenFile);
  const screen = useAppSelector(selectScreen);
  const handlers = {
    media: useAddChosenMedia(),
    subtitles: useAddChosenSubtitles(),
    dictionary: useImportChosenDictionary(),
  };
  const handled = useRef<ChosenFile | null>(null);
  const handle = async (chosen: ChosenFile) => {
    try {
      await handlers[chosen.purpose.kind](chosen, screen);
    } catch (error) {
      const reason = describeBackendError(error);
      dispatch(
        actions.notificationRequested(
          `Could not add ${chosen.file.name}: ${reason}`,
        ),
      );
    } finally {
      dispatch(actions.chosenFileHandled());
    }
  };
  useEffect(() => {
    if (chosenFile === null || handled.current === chosenFile) return;
    if (isWaitingForBytes(chosenFile)) return;
    handled.current = chosenFile;
    void handle(chosenFile);
  });
}

/** Handles one kind of chosen file. It throws to report a failure. */
export type ChosenFileHandler = (
  chosen: ChosenFile,
  screen: Screen,
) => Promise<void>;

function isWaitingForBytes({ purpose, file, bytes }: ChosenFile): boolean {
  return (
    purpose.kind === "dictionary" &&
    file.source.kind === "browser_file" &&
    bytes === null
  );
}
