import {
  useGetLibraryItemQuery,
  useGetLibraryTextQuery,
  useGetProjectQuery,
  useListMediaFilesQuery,
} from "@easyimmerse/backend";
import {
  isDocumentFileName,
  selectCurrentMediaFileId,
} from "@easyimmerse/state";
import type { MediaFile, Project } from "@easyimmerse/types";
import { ScreenLayout } from "../components/ScreenLayout.tsx";
import { LoadingStatus, Skeleton } from "../components/Skeleton.tsx";
import { useAppSelector } from "../hooks/useAppSelector.ts";
import { MediaScreen } from "./MediaScreen.tsx";
import { ProjectOverview } from "./ProjectOverview.tsx";
import { ReaderScreen } from "./ReaderScreen.tsx";

/**
 * A project: its overview, or the media screen or the reader while one of its files is open.
 * A flashcard waiting to open in one of its media files is given up if the project fails to load, or the screen goes first.
 */
export function ProjectScreen({
  projectId,
  onBack,
  onEditSettings,
}: {
  projectId: string;
  onBack: () => void;
  onEditSettings: () => void;
}) {
  const { data: project, error } = useGetProjectQuery(projectId);
  const mediaFileId = useAppSelector(selectCurrentMediaFileId);
  if (error)
    return (
      <ScreenLayout>
        <p role="alert">Could not load the project.</p>
      </ScreenLayout>
    );
  if (project === undefined)
    return (
      <ScreenLayout>
        <LoadingStatus
          label="Loading the project"
          className="flex flex-col gap-6"
        >
          <Skeleton className="h-7 w-48" />
          <Skeleton className="h-32 w-full rounded-lg" />
        </LoadingStatus>
      </ScreenLayout>
    );
  if (mediaFileId !== null)
    return (
      <OpenFileScreen
        key={mediaFileId}
        project={project}
        mediaFileId={mediaFileId}
      />
    );
  return (
    <ProjectOverview
      project={project}
      onBack={onBack}
      onEditSettings={onEditSettings}
    />
  );
}

/**
 * The reader for an ebook or a text file, and the media screen for anything else.
 * The file's name decides which, or for a file from the library, its item's kind;
 * so while the list is being fetched without the file in it, the screen waits.
 */
function OpenFileScreen({
  project,
  mediaFileId,
}: {
  project: Project;
  mediaFileId: string;
}) {
  const { data, isFetching } = useListMediaFilesQuery(project.id);
  const mediaFile = data?.media_files.find((file) => file.id === mediaFileId);
  if (mediaFile?.source.kind === "library")
    return (
      <LibraryFileScreen
        project={project}
        mediaFile={mediaFile}
        itemId={mediaFile.source.item_id}
      />
    );
  if (mediaFile && isDocumentFileName(mediaFile.name))
    return <ReaderScreen project={project} mediaFileId={mediaFileId} />;
  if (!mediaFile && isFetching) return <OpeningFile />;
  return <MediaScreen project={project} mediaFileId={mediaFileId} />;
}

/** The reader for a document item of the library, and the media screen for a video or audio item, once the item and its text arrive. */
function LibraryFileScreen({
  project,
  mediaFile,
  itemId,
}: {
  project: Project;
  mediaFile: MediaFile;
  itemId: string;
}) {
  const item = useGetLibraryItemQuery(itemId);
  const text = useGetLibraryTextQuery(itemId);
  if (item.isError || text.isError)
    return (
      <ScreenLayout>
        <p role="alert">This library item is no longer available.</p>
      </ScreenLayout>
    );
  if (!item.data || !text.data) return <OpeningFile />;
  const library = { item: item.data, text: text.data };
  return item.data.kind === "document" ? (
    <ReaderScreen
      project={project}
      mediaFileId={mediaFile.id}
      library={library}
    />
  ) : (
    <MediaScreen
      project={project}
      mediaFileId={mediaFile.id}
      library={library}
    />
  );
}

function OpeningFile() {
  return (
    <ScreenLayout>
      <p role="status" className="text-sm text-fg-muted">
        Opening the file…
      </p>
    </ScreenLayout>
  );
}
