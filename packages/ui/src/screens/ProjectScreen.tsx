import {
  useGetProjectQuery,
  useListDictionariesQuery,
  useListFlashcardsQuery,
  useRemoveMediaFileMutation,
} from "@easyimmerse/backend";
import { actions } from "@easyimmerse/state";
import type { Project } from "@easyimmerse/types";
import { useState } from "react";
import { Button } from "../components/Button.tsx";
import { HelpLink } from "../components/HelpLink.tsx";
import { ScreenLayout } from "../components/ScreenLayout.tsx";
import { useAppDispatch } from "../hooks/useAppDispatch.ts";
import { findDictionaryStatus } from "./findDictionaryStatus.ts";
import { ProjectScreenSettings } from "./ProjectScreenSettings.tsx";
import { ProjectScreenView } from "./ProjectScreenView.tsx";

/** Shows a project from the server, or its settings form while the user edits them. */
export function ProjectScreen({ projectId }: { projectId: string }) {
  const dispatch = useAppDispatch();
  const { data: project, isError } = useGetProjectQuery(projectId);
  const [isEditingSettings, setEditingSettings] = useState(false);
  if (project && isEditingSettings)
    return (
      <ProjectScreenSettings
        project={project}
        onClose={() => setEditingSettings(false)}
      />
    );
  if (project)
    return (
      <LoadedProjectScreen
        project={project}
        onEditSettings={() => setEditingSettings(true)}
      />
    );
  return (
    <ScreenLayout headerActions={<HelpLink />}>
      {isError ? (
        <p role="alert" className="text-sm text-red-700">
          Could not load the project.
        </p>
      ) : (
        <p role="status" className="text-sm text-gray-500">
          Loading project…
        </p>
      )}
      <Button
        className="self-start"
        onClick={() => dispatch(actions.homeOpened())}
      >
        All projects
      </Button>
    </ScreenLayout>
  );
}

function LoadedProjectScreen({
  project,
  onEditSettings,
}: {
  project: Project;
  onEditSettings: () => void;
}) {
  const dispatch = useAppDispatch();
  const flashcards = useListFlashcardsQuery(project.id);
  const dictionaries = useListDictionariesQuery();
  const [removeMediaFile] = useRemoveMediaFileMutation();
  const notifyUnavailable = (feature: string) =>
    dispatch(actions.notificationRequested(`${feature} is not available yet.`));
  return (
    <ProjectScreenView
      project={project}
      flashcardCount={flashcards.data?.flashcards.length ?? 0}
      dictionaryStatus={findDictionaryStatus(
        dictionaries.data?.dictionaries,
        project.settings.target_language,
      )}
      onBack={() => dispatch(actions.homeOpened())}
      onOpenMedia={(mediaId) => {
        const media = project.media.find(({ id }) => id === mediaId);
        if (media) dispatch(actions.mediaOpened(project.id, media));
      }}
      onAddMedia={() => dispatch(actions.filePickRequested({ kind: "media" }))}
      onRemoveMedia={(mediaId) =>
        removeMediaFile({ projectId: project.id, mediaId })
      }
      onEditSettings={onEditSettings}
      onSetUpDictionaries={() =>
        dispatch(actions.filePickRequested({ kind: "dictionary" }))
      }
      onExportAnkiPackage={() => notifyUnavailable("Anki deck export")}
      onSetUpAnkiConnect={() => notifyUnavailable("AnkiConnect")}
      onStartReview={() => notifyUnavailable("Reviewing in easyImmerse")}
      headerActions={<HelpLink />}
    />
  );
}
