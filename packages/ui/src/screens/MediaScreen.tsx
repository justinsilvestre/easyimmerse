import { selectCurrentMediaFileId } from "@easyimmerse/state";
import { Button } from "../components/Button.tsx";
import { PickFileButton } from "../components/PickFileButton.tsx";
import { PlayerWaveform } from "../components/PlayerWaveform.tsx";
import { PreferenceToggle } from "../components/PreferenceToggle.tsx";
import { ProjectMediaFiles } from "../components/ProjectMediaFiles.tsx";
import { ScreenLayout } from "../components/ScreenLayout.tsx";
import { SubtitlesPanel } from "../components/SubtitlesPanel.tsx";
import { useAppSelector } from "../hooks/useAppSelector.ts";
import { MediaPlayer } from "../player/MediaPlayer.tsx";

export function MediaScreen({
  projectId,
  onBack,
}: {
  projectId: string;
  onBack: () => void;
}) {
  const mediaFileId = useAppSelector(selectCurrentMediaFileId);
  return (
    <ScreenLayout headerActions={<Button onClick={onBack}>Back</Button>}>
      <h1 className="text-xl font-semibold">Project {projectId}</h1>
      <ProjectMediaFiles projectId={projectId} />
      <MediaPlayer projectId={projectId} />
      {mediaFileId !== null && (
        <PlayerWaveform projectId={projectId} mediaFileId={mediaFileId} />
      )}
      <div className="flex items-center gap-4">
        <PickFileButton />
        <PreferenceToggle
          preferenceKey="showTranslations"
          label="Show translations"
        />
      </div>
      <SubtitlesPanel />
    </ScreenLayout>
  );
}
