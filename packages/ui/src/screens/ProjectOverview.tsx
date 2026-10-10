import {
  useListDictionariesQuery,
  useListFlashcardsQuery,
  useListMediaFilesQuery,
  useListPluginsQuery,
  useRemoveMediaFileMutation,
} from "@easyimmerse/backend";
import {
  actions,
  type MediaImportSource,
  type NoticeTone,
  selectMediaImport,
  transientNotice,
} from "@easyimmerse/state";
import type { Project } from "@easyimmerse/types";
import { useAppDispatch } from "../hooks/useAppDispatch.ts";
import { useAppSelector } from "../hooks/useAppSelector.ts";
import { useNavigate } from "../hooks/useNavigate.ts";
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
 * The ways to review or export flashcards are not built yet, so each is marked as coming soon and explains so when chosen.
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
  const notify = (tone: NoticeTone, message: string) =>
    dispatch(actions.noticeRequested(transientNotice(tone, message)));
  const notYet = () =>
    notify("info", "Reviewing and exporting flashcards is not available yet.");
  const media = useMediaItems(project.id);
  const [removeMediaFile] = useRemoveMediaFileMutation();
  const importSources = useImportSources();
  const importMedia = useAppSelector(selectMediaImport);
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
            removeMediaFile({ projectId: project.id, mediaFileId })
              .unwrap()
              .then(() => dispatch(actions.mediaFileRemoved(mediaFileId)))
              .catch(() =>
                notify("danger", "The media file could not be removed"),
              )
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
      <FlashcardSyncPanel
        state={{ kind: "notStarted" }}
        comingSoon={["review", "ankiPackage", "ankiConnect"]}
        includedFields={settings.flashcard_fields}
        languages={{
          target: settings.target_language,
          translation: settings.translation_language,
        }}
        onExportPackage={notYet}
        onSetUpAnkiConnect={notYet}
        onStartReview={notYet}
        onSendToAnki={notYet}
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
