import { actions } from "@easyimmerse/state";
import type { ProjectSettings } from "@easyimmerse/types";
import { useAppDispatch } from "../../hooks/useAppDispatch.ts";
import { FlashcardSyncPanel } from "../../projects/FlashcardSyncPanel.tsx";

/** The ways to use the project's flashcards. None is built yet, so each one says so. */
export function ProjectFlashcardSyncPanel({
  settings,
}: {
  settings: ProjectSettings;
}) {
  const dispatch = useAppDispatch();
  const sayUnavailable = (feature: string) => () =>
    dispatch(actions.notificationRequested(`${feature} is not available yet`));
  return (
    <FlashcardSyncPanel
      state={{ kind: "notStarted" }}
      includedFields={settings.flashcard_fields}
      languages={{
        target: settings.target_language,
        translation: settings.translation_language,
      }}
      onStartReview={sayUnavailable("Reviewing in easyImmerse")}
      onExportPackage={sayUnavailable("Exporting an Anki deck")}
      onSetUpAnkiConnect={sayUnavailable("AnkiConnect")}
      onSendToAnki={sayUnavailable("Sending to Anki")}
    />
  );
}
