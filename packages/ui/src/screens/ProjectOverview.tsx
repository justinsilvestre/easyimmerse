import type { BackendError } from "@easyimmerse/backend";
import {
  useAddMediaFromSourceMutation,
  useListDictionariesQuery,
  useListFlashcardsQuery,
  useListMediaFilesQuery,
  useListPluginsQuery,
  useRemoveMediaFileMutation,
} from "@easyimmerse/backend";
import { actions } from "@easyimmerse/state";
import type { Project } from "@easyimmerse/types";
import { useState } from "react";
import { useAppDispatch } from "../hooks/useAppDispatch.ts";
import { useNavigationActions } from "../navigationContext.ts";
import { AddMediaFromUrlDialog } from "../projects/AddMediaFromUrlDialog.tsx";
import { DictionaryStatus } from "../projects/DictionaryStatus.tsx";
import { dictionaryStatusesOf } from "../projects/dictionaryStatusesOf.ts";
import { FlashcardSyncPanel } from "../projects/FlashcardSyncPanel.tsx";
import { MediaSection } from "../projects/MediaSection.tsx";
import { mediaItemsOf } from "../projects/mediaItemsOf.ts";
import { ProjectView } from "../projects/ProjectView.tsx";

/**
 * The project screen: whether its languages have dictionaries, its media files, and where its flashcards go.
 * Work is saved on the server as it happens, so the project always reads as saved.
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
  const notify = (message: string) =>
    dispatch(actions.notificationRequested(message));
  const notYet = () =>
    notify("Reviewing and exporting flashcards is not available yet.");
  const media = useMediaItems(project.id);
  const [removeMediaFile] = useRemoveMediaFileMutation();
  const mediaSources = useMediaSources();
  const fromUrl = useAddMediaFromUrl(project.id);
  const dictionaries = useListDictionariesQuery().data?.dictionaries;
  const { openDictionaries } = useNavigationActions();
  const { settings } = project;
  return (
    <ProjectView
      name={settings.name}
      hasUnsavedChanges={false}
      onBack={onBack}
      onSave={() => notify("Your work is saved as you go.")}
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
          onAddMedia={() => dispatch(actions.mediaFilePickRequested())}
          onAddMediaFromUrl={mediaSources.length > 0 ? fromUrl.open : null}
          onOpenMedia={(mediaFileId) =>
            dispatch(actions.openMedia(mediaFileId))
          }
          onDeleteMedia={(mediaFileId) =>
            removeMediaFile({ projectId: project.id, mediaFileId })
              .unwrap()
              .then(() => dispatch(actions.mediaFileRemoved(mediaFileId)))
              .catch(() => notify("The media file could not be removed"))
          }
        />
      )}
      {fromUrl.isOpen && (
        <AddMediaFromUrlDialog
          sources={mediaSources}
          isAdding={fromUrl.isAdding}
          error={fromUrl.error}
          onAdd={fromUrl.add}
          onCancel={fromUrl.close}
        />
      )}
      <FlashcardSyncPanel
        state={{ kind: "notStarted" }}
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

/** The installed plugins that fetch media from a URL, by name. */
function useMediaSources() {
  const plugins = useListPluginsQuery().data?.plugins ?? [];
  return plugins
    .filter((plugin) => plugin.kind === "media-source")
    .map((plugin) => ({ name: plugin.name }));
}

/**
 * The dialog for adding media from a URL: whether it shows, and the fetch it started.
 * A fetched media file opens at once, as a picked file does.
 */
function useAddMediaFromUrl(projectId: string) {
  const dispatch = useAppDispatch();
  const [isOpen, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [addMediaFromSource, { isLoading }] = useAddMediaFromSourceMutation();
  return {
    isOpen,
    isAdding: isLoading,
    error,
    open: () => {
      setError(null);
      setOpen(true);
    },
    close: () => setOpen(false),
    add: (plugin: string, locator: string) => {
      setError(null);
      addMediaFromSource({ projectId, request: { plugin, locator } })
        .unwrap()
        .then((mediaFile) => {
          setOpen(false);
          dispatch(actions.mediaFileAdded(mediaFile.id));
        })
        .catch((failure: BackendError) =>
          setError(failure.message ?? "The media could not be added."),
        );
    },
  };
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
