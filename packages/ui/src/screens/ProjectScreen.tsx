import {
  useGetProjectQuery,
  useMarkProjectOpenedMutation,
} from "@easyimmerse/backend";
import { selectCurrentMediaFileId } from "@easyimmerse/state";
import { useEffect } from "react";
import { ScreenLayout } from "../components/ScreenLayout.tsx";
import { useGiveUpOpenings } from "../flashcards/unsaved/useGiveUpOpenings.ts";
import { useAddChosenMediaFile } from "../hooks/useAddChosenMediaFile.ts";
import { useAppSelector } from "../hooks/useAppSelector.ts";
import { MediaScreen } from "./MediaScreen.tsx";
import { ProjectOverview } from "./ProjectOverview.tsx";

/**
 * A project: its overview, or the media screen while one of its media files is open.
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
  useMarkOpened(projectId);
  useGiveUpOpenings("projectId", projectId, error !== undefined);
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
      <MediaScreen
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

/** Records once per project that it was opened, which moves it to the front of the home screen. */
function useMarkOpened(projectId: string): void {
  const [markOpened] = useMarkProjectOpenedMutation();
  useEffect(() => {
    markOpened(projectId);
  }, [markOpened, projectId]);
}
