import {
  useListAnkiPendingDeletionsQuery,
  useListDictionariesQuery,
  useListFlashcardsQuery,
  useListMediaFilesQuery,
  useListPluginsQuery,
} from "@easyimmerse/backend";
import {
  actions,
  type MediaImportSource,
  selectAnkiExport,
  selectFlashcardSync,
  selectIsAnkiConnectSetupOpen,
  selectMediaImport,
  transientNotice,
} from "@easyimmerse/state";
import type { Project } from "@easyimmerse/types";
import { useAppDispatch } from "../hooks/useAppDispatch.ts";
import { useAppSelector } from "../hooks/useAppSelector.ts";
import { useNavigate } from "../hooks/useNavigate.ts";
import { AnkiConnectSetupDialog } from "../projects/AnkiConnectSetupDialog.tsx";
import { AnkiExportDialog } from "../projects/AnkiExportDialog.tsx";
import { DictionaryStatus } from "../projects/DictionaryStatus.tsx";
import { dictionaryStatusesOf } from "../projects/dictionaryStatusesOf.ts";
import { FlashcardSyncPanel } from "../projects/FlashcardSyncPanel.tsx";
import { ImportMediaDialog } from "../projects/ImportMediaDialog.tsx";
import { MediaSection } from "../projects/MediaSection.tsx";
import { mediaItemsOf } from "../projects/mediaItemsOf.ts";
import { ProjectView } from "../projects/ProjectView.tsx";

/**
 * The project screen: whether its languages have dictionaries, its media files, and where its flashcards go.
 * Work is saved on the server as it happens, so the screen offers nothing to save by hand.
 * The review is not built yet, so it is marked as coming soon and explains so when chosen.
 */
export function ProjectOverview({
  project,
  onBack,
  onEditSettings,
}: {
  project: Project;
  onBack: () => void;
  onEditSettings: () => void;
}) {
  const dispatch = useAppDispatch();
  const notYet = () =>
    dispatch(
      actions.noticeRequested(
        transientNotice("info", "Reviewing flashcards is not available yet."),
      ),
    );
  const media = useMediaItems(project.id);
  const importSources = useImportSources();
  const importMedia = useAppSelector(selectMediaImport);
  const ankiExport = useAppSelector(selectAnkiExport);
  const isAnkiConnectSetupOpen = useAppSelector(selectIsAnkiConnectSetupOpen);
  const flashcardSync = useAppSelector((state) =>
    selectFlashcardSync(state, project.id),
  );
  // The panel lists or counts the deleted flashcards still to be deleted from Anki from this query's cached answer.
  useListAnkiPendingDeletionsQuery(project.id);
  const dictionaries = useListDictionariesQuery().data?.dictionaries;
  const navigate = useNavigate();
  const openDictionaries = () => navigate({ type: "openDictionaries" });
  const { settings } = project;
  return (
    <ProjectView
      name={settings.name}
      onBack={onBack}
      onEditSettings={onEditSettings}
    >
      {dictionaries && (
        <DictionaryStatus
          statuses={dictionaryStatusesOf(dictionaries, settings)}
          onOpenDictionaries={openDictionaries}
        />
      )}
      {media.error ? (
        <p role="alert">Could not load the media files.</p>
      ) : (
        <MediaSection
          media={media.items}
          importSources={importSources}
          onAddMedia={() => dispatch(actions.mediaFilePickRequested())}
          onImportMedia={(source) =>
            dispatch(actions.mediaImportOpened(source))
          }
          onOpenMedia={(mediaFileId) =>
            dispatch(actions.openMediaFileRequested(project.id, mediaFileId))
          }
          onDeleteMedia={(mediaFileId) =>
            dispatch(actions.mediaFileRemovalRequested(mediaFileId))
          }
        />
      )}
      {importMedia && (
        <ImportMediaDialog
          label={importMedia.source.label}
          form={importMedia.form}
          isBusy={importMedia.isBusy}
          job={importMedia.job}
          error={importMedia.error}
          onAction={(actionId, input) =>
            dispatch(actions.mediaImportStepTaken(actionId, input))
          }
          onClose={() => dispatch(actions.mediaImportClosed())}
        />
      )}
      {ankiExport && (
        <AnkiExportDialog
          mediaFiles={media.items}
          chosenMediaFileIds={ankiExport.mediaFileIds}
          scope={ankiExport.scope}
          newAndChangedCount={ankiExport.newAndChangedCount}
          allCount={ankiExport.allCount}
          marksExported={ankiExport.marksExported}
          duplicateCount={ankiExport.duplicateCount}
          markCount={ankiExport.markCount}
          isBusy={ankiExport.isBusy}
          onScopeChange={(scope) =>
            dispatch(actions.ankiExportScopeChosen(scope))
          }
          onMarkingChange={(marksExported) =>
            dispatch(actions.ankiExportMarkingChosen(marksExported))
          }
          onMediaToggle={(mediaFileId) =>
            dispatch(actions.ankiExportMediaToggled(mediaFileId))
          }
          onExport={() => dispatch(actions.ankiExportConfirmed())}
          onClose={() => dispatch(actions.ankiExportClosed())}
        />
      )}
      {isAnkiConnectSetupOpen && (
        <AnkiConnectSetupDialog
          onConnect={() => dispatch(actions.ankiConnectSetupRequested())}
          onClose={() => dispatch(actions.ankiConnectSetupClosed())}
        />
      )}
      <FlashcardSyncPanel
        sync={flashcardSync}
        includedFields={settings.flashcard_fields}
        frontFields={settings.flashcard_front_fields}
        languages={{
          target: settings.target_language,
          translation: settings.translation_language,
        }}
        onExportPackage={() => dispatch(actions.ankiExportOpened())}
        onSetUpAnkiConnect={() => dispatch(actions.ankiConnectSetupOpened())}
        onStartReview={notYet}
        onSendToAnki={() => dispatch(actions.ankiSendRequested())}
        onCheckConnection={() =>
          dispatch(actions.ankiConnectionCheckRequested())
        }
        onTurnOffAnkiConnect={() => dispatch(actions.ankiConnectTurnedOff())}
        onCopyAnkiSearch={() =>
          dispatch(
            actions.textCopyRequested(
              flashcardSync.package.ankiSearch,
              "Anki search",
            ),
          )
        }
        onMarkDeletionsDone={() => dispatch(actions.ankiDeletionsMarkedDone())}
      />
    </ProjectView>
  );
}

/**
 * The installed media-source plugins, with the labels of their import buttons.
 * The server gives every media-source plugin a label, so the title only stands in for a missing one.
 */
function useImportSources(): MediaImportSource[] {
  const plugins = useListPluginsQuery().data?.plugins ?? [];
  return plugins
    .filter((plugin) => plugin.kind === "media-source")
    .map((plugin) => ({
      name: plugin.name,
      label: plugin.import_label ?? plugin.title,
    }));
}

function useMediaItems(projectId: string) {
  const mediaFiles = useListMediaFilesQuery(projectId);
  const flashcards = useListFlashcardsQuery(projectId);
  return {
    items: mediaItemsOf(
      mediaFiles.data?.media_files ?? [],
      flashcards.data?.flashcards ?? [],
    ),
    error: mediaFiles.error,
  };
}
