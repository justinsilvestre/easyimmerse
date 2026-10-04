import {
  useGetProjectQuery,
  useMarkProjectOpenedMutation,
} from "@easyimmerse/backend";
import { actions, selectCurrentMediaFileId } from "@easyimmerse/state";
import { useEffect, useRef } from "react";
import { useAppDispatch } from "../hooks/useAppDispatch.ts";
import { useAppSelector } from "../hooks/useAppSelector.ts";
import { ProjectView } from "../projects/ProjectView.tsx";
import { MediaScreen } from "./MediaScreen.tsx";
import { ProjectDictionaryStatus } from "./project/ProjectDictionaryStatus.tsx";
import { ProjectFlashcardSyncPanel } from "./project/ProjectFlashcardSyncPanel.tsx";
import { ProjectMediaSection } from "./project/ProjectMediaSection.tsx";
import { ScreenMessage } from "./ScreenMessage.tsx";

/** A project's dictionaries, media, and flashcards, or the media screen while one of its files is open. */
export function ProjectScreen({
  projectId,
  onBack,
  onEditSettings,
}: {
  projectId: string;
  onBack: () => void;
  onEditSettings: () => void;
}) {
  const dispatch = useAppDispatch();
  const mediaFileId = useAppSelector(selectCurrentMediaFileId);
  const { data: project, isLoading } = useGetProjectQuery(projectId);
  useMarkProjectOpened(projectId);
  const goBack = () => {
    dispatch(actions.closeMedia());
    onBack();
  };
  if (isLoading)
    return (
      <ScreenMessage
        status="loading"
        message="Loading the project…"
        onBack={goBack}
      />
    );
  if (!project)
    return (
      <ScreenMessage
        status="failed"
        message="Could not load the project."
        onBack={goBack}
      />
    );
  if (mediaFileId !== null)
    return (
      <MediaScreen
        project={project}
        mediaFileId={mediaFileId}
        onBack={() => dispatch(actions.closeMedia())}
      />
    );
  return (
    <ProjectView
      name={project.name}
      hasUnsavedChanges={false}
      onBack={goBack}
      onSave={() =>
        dispatch(
          actions.notificationRequested(
            "The project saves every change as you make it",
          ),
        )
      }
      onEditSettings={onEditSettings}
    >
      <ProjectDictionaryStatus settings={project.settings} />
      <ProjectMediaSection projectId={projectId} />
      <ProjectFlashcardSyncPanel settings={project.settings} />
    </ProjectView>
  );
}

/** Tells the server once that the project was opened, so the home screen lists it first. */
function useMarkProjectOpened(projectId: string): void {
  const [markProjectOpened] = useMarkProjectOpenedMutation();
  // Strict mode runs effects twice, and each project must be marked only once.
  const markedId = useRef<string | null>(null);
  useEffect(() => {
    if (markedId.current === projectId) return;
    markedId.current = projectId;
    markProjectOpened(projectId);
  }, [projectId, markProjectOpened]);
}
