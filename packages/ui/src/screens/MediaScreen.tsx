import { useGetProjectQuery } from "@easyimmerse/backend";
import { actions, selectLookup } from "@easyimmerse/state";
import type { MediaFile, Project, SubtitleRole } from "@easyimmerse/types";
import { DictionaryPopup } from "../components/DictionaryPopup.tsx";
import { FlashcardEditor } from "../components/FlashcardEditor.tsx";
import { describeBackendError } from "../describeBackendError.ts";
import { useAppDispatch } from "../hooks/useAppDispatch.ts";
import { useAppSelector } from "../hooks/useAppSelector.ts";
import { useCreateFlashcardDraft } from "../hooks/useCreateFlashcardDraft.ts";
import { useRecordMediaDuration } from "../hooks/useRecordMediaDuration.ts";
import { useSaveFlashcard } from "../hooks/useSaveFlashcard.ts";
import { useSubtitleCues } from "../hooks/useSubtitleCues.ts";
import { useTermLookup } from "../hooks/useTermLookup.ts";
import { MediaScreenLayout } from "./MediaScreenLayout.tsx";
import { MediaScreenPlayer } from "./MediaScreenPlayer.tsx";
import { MediaScreenReader } from "./MediaScreenReader.tsx";

/** Plays or shows a media file of a project, with the dictionary pop-up and the flashcard editor. */
export function MediaScreen({
  projectId,
  mediaId,
}: {
  projectId: string;
  mediaId: string;
}) {
  const { data: project, error } = useGetProjectQuery(projectId);
  const media = project?.media.find(({ id }) => id === mediaId);
  const failure = describeLoadFailure(error, project);
  return (
    <MediaScreenLayout title={media?.name ?? ""}>
      {project && media ? (
        <OpenMediaScreen project={project} media={media} />
      ) : failure !== null ? (
        <p
          role="alert"
          className="bg-danger-soft px-4 py-2 text-sm text-danger-fg"
        >
          {failure}
        </p>
      ) : (
        <p role="status" className="p-8 text-center text-sm text-neutral-400">
          Loading…
        </p>
      )}
    </MediaScreenLayout>
  );
}

function OpenMediaScreen({
  project,
  media,
}: {
  project: Project;
  media: MediaFile;
}) {
  const dispatch = useAppDispatch();
  const lookup = useAppSelector(selectLookup);
  const targetCues = useSubtitleCues(
    project.id,
    media.id,
    findTrack(media, "target"),
  );
  const translationCues = useSubtitleCues(
    project.id,
    media.id,
    findTrack(media, "translation"),
  );
  const termLookup = useTermLookup(project.settings.target_language);
  const createDraft = useCreateFlashcardDraft(project, media, translationCues);
  const { saveFlashcard, deleteFlashcard } = useSaveFlashcard(project.id);
  useRecordMediaDuration(project.id, media);
  return (
    <>
      {media.kind === "document" ? (
        <MediaScreenReader media={media} onWordActivated={createDraft} />
      ) : (
        <MediaScreenPlayer
          kind={media.kind}
          targetCues={targetCues}
          translationCues={translationCues}
          onWordActivated={createDraft}
        />
      )}
      <DictionaryPopup
        results={termLookup.results}
        status={termLookup.status}
        hasDictionaries={termLookup.hasDictionaries}
        onCreateFlashcard={(picked) => {
          if (lookup.kind === "closed") return;
          const { term, context, clip } = lookup;
          createDraft(
            { word: term, context, clip },
            { picked, results: termLookup.results },
          );
        }}
        onSetUpDictionary={() =>
          dispatch(actions.filePickRequested({ kind: "dictionary" }))
        }
      />
      <FlashcardEditor onSave={saveFlashcard} onDelete={deleteFlashcard} />
    </>
  );
}

/** Explains why the media cannot be shown, or returns null while the project is still loading. */
function describeLoadFailure(
  error: unknown,
  project: Project | undefined,
): string | null {
  if (error !== undefined)
    return `Could not load the project: ${describeBackendError(error)}`;
  if (project) return "The media file is no longer in this project.";
  return null;
}

/** Returns the first track in the role. */
function findTrack(media: MediaFile, role: SubtitleRole) {
  return media.subtitle_tracks.find((track) => track.role === role);
}
