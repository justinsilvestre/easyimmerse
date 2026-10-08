import { Settings } from "lucide-react";
import type { ReactNode } from "react";
import { Button } from "../components/Button.tsx";
import { ScreenLayout } from "../components/ScreenLayout.tsx";

/**
 * The project screen's frame: its name, the way back, and the project's settings.
 * Work is saved as it happens, so there is nothing to save by hand.
 * The sections below the name, such as the media list and the flashcards panel, come in as children.
 */
export function ProjectView({
  name,
  onBack,
  onEditSettings,
  children,
}: {
  name: string;
  onBack: () => void;
  onEditSettings: () => void;
  children: ReactNode;
}) {
  return (
    <ScreenLayout onBack={onBack} backLabel="Projects">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="min-w-0 truncate text-xl font-semibold">{name}</h1>
        <Button variant="subtle" onClick={onEditSettings}>
          <Settings className="size-4" aria-hidden />
          Project settings
        </Button>
      </div>
      {children}
    </ScreenLayout>
  );
}
