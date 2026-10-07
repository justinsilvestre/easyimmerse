import type { BackendError } from "@easyimmerse/backend";
import {
  skipToken,
  useAddMediaFromSourceMutation,
  useDescribeMediaSourceMutation,
  useGetMediaSourceJobQuery,
  useListDictionariesQuery,
  useListFlashcardsQuery,
  useListMediaFilesQuery,
  useListPluginsQuery,
  useRemoveMediaFileMutation,
} from "@easyimmerse/backend";
import { actions } from "@easyimmerse/state";
import type { MediaDescription, Project } from "@easyimmerse/types";
import { useEffect, useState } from "react";
import { useAppDispatch } from "../hooks/useAppDispatch.ts";
import { useNavigationActions } from "../navigationContext.ts";
import {
  AddMediaFromUrlDialog,
  type MediaLookup,
} from "../projects/AddMediaFromUrlDialog.tsx";
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
          languages={{
            target: settings.target_language,
            translation: settings.translation_language,
          }}
          lookup={fromUrl.lookup}
          isStarting={fromUrl.isStarting}
          job={fromUrl.job}
          error={fromUrl.error}
          onLookUp={fromUrl.lookUp}
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

/** How often the dialog asks the server about the fetch while it runs. */
const JOB_POLLING_INTERVAL_MS = 1000;

const noLookup: MediaLookup = {
  isLooking: false,
  description: null,
  error: null,
};

/**
 * The dialog for adding media from a URL: whether it shows, what the plugin found at the
 * typed locator, and the fetch it started, which the server runs as a job that is polled
 * while it runs. A fetched media file opens at once, as a picked file does. Closing the
 * dialog stops watching the fetch; the server finishes it anyway.
 */
function useAddMediaFromUrl(projectId: string) {
  const dispatch = useAppDispatch();
  const [isOpen, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [jobId, setJobId] = useState<string | null>(null);
  const [found, setFound] = useState<Omit<MediaLookup, "isLooking">>(noLookup);
  const [describe, { isLoading: isLooking }] = useDescribeMediaSourceMutation();
  const [addMediaFromSource, { isLoading: isStarting }] =
    useAddMediaFromSourceMutation();
  const { data: job } = useGetMediaSourceJobQuery(
    jobId === null ? skipToken : { projectId, jobId },
    { pollingInterval: JOB_POLLING_INTERVAL_MS },
  );
  const watched = job?.id === jobId ? job : null;
  const addedId =
    watched?.status === "done" ? (watched.media_file?.id ?? null) : null;
  useEffect(() => {
    if (addedId === null) return;
    setOpen(false);
    setJobId(null);
    dispatch(actions.mediaFileAdded(addedId));
  }, [addedId, dispatch]);
  return {
    isOpen,
    lookup: { ...found, isLooking },
    isStarting,
    job: watched,
    error,
    open: () => {
      setError(null);
      setJobId(null);
      setFound(noLookup);
      setOpen(true);
    },
    close: () => {
      setOpen(false);
      setJobId(null);
    },
    lookUp: (plugin: string, locator: string) => {
      setFound(noLookup);
      describe({ plugin, request: { locator } })
        .unwrap()
        .then((description: MediaDescription) =>
          setFound({ description, error: null }),
        )
        .catch((failure: BackendError) =>
          setFound({
            description: null,
            error: failure.message ?? "The media could not be looked up.",
          }),
        );
    },
    add: (plugin: string, locator: string, subtitles: string[]) => {
      setError(null);
      setJobId(null);
      addMediaFromSource({ projectId, request: { plugin, locator, subtitles } })
        .unwrap()
        .then((job) => setJobId(job.id))
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
