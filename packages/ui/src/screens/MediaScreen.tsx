import { Button } from "../components/Button.tsx";
import { PickFileButton } from "../components/PickFileButton.tsx";
import { PreferenceToggle } from "../components/PreferenceToggle.tsx";
import { ProjectMediaFiles } from "../components/ProjectMediaFiles.tsx";
import { ScreenLayout } from "../components/ScreenLayout.tsx";
import { StubPlayer } from "../components/StubPlayer.tsx";
import { SubtitlesPanel } from "../components/SubtitlesPanel.tsx";

export function MediaScreen({
  projectId,
  onBack,
}: {
  projectId: string;
  onBack: () => void;
}) {
  return (
    <ScreenLayout headerActions={<Button onClick={onBack}>Back</Button>}>
      <h1 className="text-xl font-semibold">Project {projectId}</h1>
      <ProjectMediaFiles projectId={projectId} />
      <StubPlayer />
      <div className="flex items-center gap-4">
        <PickFileButton />
        <PreferenceToggle />
      </div>
      <SubtitlesPanel />
    </ScreenLayout>
  );
}
