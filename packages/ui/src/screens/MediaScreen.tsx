import { Button } from "../components/Button.tsx";
import { PickFileButton } from "../components/PickFileButton.tsx";
import { PreferenceToggle } from "../components/PreferenceToggle.tsx";
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
    <main className="mx-auto flex max-w-xl flex-col gap-4 p-4">
      <header className="flex items-center justify-between">
        <Button onClick={onBack}>Back</Button>
        <h1 className="text-xl font-semibold">Project {projectId}</h1>
      </header>
      <StubPlayer />
      <div className="flex items-center gap-4">
        <PickFileButton />
        <PreferenceToggle />
      </div>
      <SubtitlesPanel />
    </main>
  );
}
