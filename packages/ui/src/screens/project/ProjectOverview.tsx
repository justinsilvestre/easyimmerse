import {
  useGetMediaAvailabilityQuery,
  useGetReviewSummaryQuery,
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
  selectPathOfStep,
} from "@easyimmerse/state";
import type { Project } from "@easyimmerse/types";
import { useBrowserFileRegistry } from "../../browserFileRegistryContext.ts";
import { pathAvailabilitiesOf } from "../../lib/mediaIssues/pathAvailabilitiesOf.ts";
import { useAppDispatch } from "../../useAppDispatch.ts";
import { useAppSelector } from "../../useAppSelector.ts";
import { useNavigate } from "../../useNavigate.ts";
import { AnkiConnectSetupDialog } from "./AnkiConnectSetupDialog.tsx";
import { AnkiExportDialog } from "./AnkiExportDialog.tsx";
import { DictionaryStatus } from "./DictionaryStatus.tsx";
import { dictionaryStatusesOf } from "./dictionaryStatusesOf.ts";
import { ImportMediaDialog } from "./ImportMediaDialog.tsx";
import { MediaSection } from "./MediaSection.tsx";
import { mediaItemsOf } from "./mediaItemsOf.ts";
import { ProjectFlashcardsPanel } from "./ProjectFlashcardsPanel.tsx";
import { ProjectView } from "./ProjectView.tsx";

/**
 * The project screen: whether its languages have dictionaries, its media files, and where its flashcards go.
 * Work is saved on the server as it happens, so the screen offers nothing to save by hand.
 */
export function ProjectOverview({ project }: { project: Project }) {
  const dispatch = useAppDispatch();
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
  // The panel shows what waits in the review from this query's cached answer, which depends on the time of day.
  useGetReviewSummaryQuery(project.id, { refetchOnMountOrArgChange: true });
  const dictionaries = useListDictionariesQuery().data?.dictionaries;
  const navigate = useNavigate();
  const dictionariesHref = useAppSelector((state) =>
    selectPathOfStep(state, { type: "openDictionaries" }),
  );
  const { settings } = project;
  return (
    <ProjectView projectId={project.id} name={settings.name}>
      {dictionaries && (
        <DictionaryStatus
          statuses={dictionaryStatusesOf(dictionaries, settings)}
          dictionariesHref={dictionariesHref}
        />
      )}
      {media.error ? (
        <p role="alert">Could not load the media files.</p>
      ) : (
        <MediaSection
          projectId={project.id}
          media={media.items}
          importSources={importSources}
          onAddMedia={() => dispatch(actions.mediaFilePickRequested())}
          onImportMedia={(source) =>
            dispatch(actions.mediaImportOpened(source))
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
        onStartReview={() =>
          navigate({ type: "openReview", projectId: project.id })
        }
        onReviewMore={(reviewCount) =>
          dispatch(actions.projectReviewMoreRequested(project.id, reviewCount))
        }
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
