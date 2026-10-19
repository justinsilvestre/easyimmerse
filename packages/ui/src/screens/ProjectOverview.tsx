import {
  useGetMediaAvailabilityQuery,
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
import type { MediaAvailabilityResponse, Project } from "@easyimmerse/types";
import { useBrowserFileRegistry } from "../browserFileRegistryContext.ts";
import { useAppDispatch } from "../hooks/useAppDispatch.ts";
import { useAppSelector } from "../hooks/useAppSelector.ts";
import { useNavigate } from "../hooks/useNavigate.ts";
import { AnkiConnectSetupDialog } from "../projects/AnkiConnectSetupDialog.tsx";
import { AnkiExportDialog } from "../projects/AnkiExportDialog.tsx";
import { DictionaryStatus } from "../projects/DictionaryStatus.tsx";
import { dictionaryStatusesOf } from "../projects/dictionaryStatusesOf.ts";
import { ImportMediaDialog } from "../projects/ImportMediaDialog.tsx";
import { MediaSection } from "../projects/MediaSection.tsx";
import type { PathAvailabilities } from "../projects/mediaIssueOf.ts";
import { mediaItemsOf } from "../projects/mediaItemsOf.ts";
import { ProjectFlashcardsPanel } from "../projects/ProjectFlashcardsPanel.tsx";
import { ProjectView } from "../projects/ProjectView.tsx";

/**
 * The project screen: whether its languages have dictionaries, its media files, and where its flashcards go.
 * Work is saved on the server as it happens, so the screen offers nothing to save by hand.
 * The review is not wired up yet, so choosing it says that it is not available.
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
          mediaFiles={media.items ?? []}
          chosenMediaFileIds={ankiExport.mediaFileIds}
          scope={ankiExport.scope}
          newAndChangedCount={ankiExport.newAndChangedCount}
          allCount={ankiExport.allCount}
          marksExported={ankiExport.marksExported}
          duplicateCount={ankiExport.duplicateCount}
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
      <ProjectFlashcardsPanel
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
        onCheckConnection={() =>
          dispatch(actions.ankiConnectionCheckRequested())
        }
        onTryAnkiSyncAgain={() => dispatch(actions.ankiSendRequested())}
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

/**
 * The project's media files as the screen lists them, undefined until the files and their flashcard counts have loaded.
 * Availability is not awaited, since the server checks it again on every visit; a file's issue shows once the answer arrives.
 */
function useMediaItems(projectId: string) {
  const mediaFiles = useListMediaFilesQuery(projectId);
  const flashcards = useListFlashcardsQuery(projectId);
  const availability = useGetMediaAvailabilityQuery(projectId, {
    refetchOnMountOrArgChange: true,
  });
  const registry = useBrowserFileRegistry();
  return {
    items:
      mediaFiles.data && !flashcards.isLoading
        ? mediaItemsOf(
            mediaFiles.data.media_files,
            flashcards.data?.flashcards ?? [],
            registry,
            pathAvailabilitiesOf(availability.data),
          )
        : undefined,
    error: mediaFiles.error,
  };
}

/** What the server reported for each media file at a path, empty until its answer arrives. */
function pathAvailabilitiesOf(
  response: MediaAvailabilityResponse | undefined,
): PathAvailabilities {
  return new Map(
    response?.media_files.map(({ media_id, availability }) => [
      media_id,
      availability,
    ]),
  );
}
