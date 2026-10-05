import {
  useGetProjectQuery,
  useListMediaFilesQuery,
  useMarkProjectOpenedMutation,
} from "@easyimmerse/backend";
import {
  isDocumentFileName,
  selectCurrentMediaFileId,
} from "@easyimmerse/state";
import type { Project } from "@easyimmerse/types";
import { useEffect } from "react";
import { ScreenLayout } from "../components/ScreenLayout.tsx";
import { useAddChosenMediaFile } from "../hooks/useAddChosenMediaFile.ts";
import { useAppSelector } from "../hooks/useAppSelector.ts";
import { MediaScreen } from "./MediaScreen.tsx";
import { ProjectOverview } from "./ProjectOverview.tsx";
import { ReaderScreen } from "./ReaderScreen.tsx";

/** A project: its overview, or the media screen or the reader while one of its files is open. */
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
  useMarkOpened(projectId);
  useAddChosenMediaFile(projectId);
  if (error)
    return (
      <ScreenLayout>
        <p role="alert">Could not load the project.</p>
      </ScreenLayout>
    );
  if (project === undefined)
    return (
      <ScreenLayout>
        <p className="text-sm text-fg-muted">Loading the project…</p>
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
 * A file added a moment ago may be missing from the list until it is fetched again, and waits for it.
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
  if (mediaFile && isDocumentFileName(mediaFile.name))
    return <ReaderScreen project={project} mediaFileId={mediaFileId} />;
  if (!mediaFile && isFetching)
    return (
      <ScreenLayout>
        <p className="text-sm text-fg-muted">Opening the file…</p>
      </ScreenLayout>
    );
  return <MediaScreen project={project} mediaFileId={mediaFileId} />;
}

/** Records once per project that it was opened, which moves it to the front of the home screen. */
function useMarkOpened(projectId: string): void {
  const [markOpened] = useMarkProjectOpenedMutation();
  useEffect(() => {
    markOpened(projectId);
  }, [markOpened, projectId]);
}
