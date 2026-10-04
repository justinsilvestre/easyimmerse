import { ArrowLeft, Save, Settings } from "lucide-react";
import type { ReactNode } from "react";
import { Button } from "../components/Button.tsx";
import { ScreenLayout } from "../components/ScreenLayout.tsx";

/**
 * The project screen's frame: its name, the way back, saving, and settings.
 * The sections below the name, such as the media list and the flashcards panel, come in as children.
 */
export function ProjectView({
  name,
  hasUnsavedChanges,
  onBack,
  onSave,
  onEditSettings,
  children,
}: {
  name: string;
  hasUnsavedChanges: boolean;
  onBack: () => void;
  onSave: () => void;
  onEditSettings: () => void;
  children: ReactNode;
}) {
  return (
    <ScreenLayout
      headerActions={
        <>
          <Button variant="subtle" aria-label="Projects" onClick={onBack}>
            <ArrowLeft className="size-4" aria-hidden />
            <span className="hidden sm:inline">Projects</span>
          </Button>
          <Button
            variant={hasUnsavedChanges ? "primary" : "subtle"}
            onClick={onSave}
          >
            <Save className="size-4" aria-hidden />
            {hasUnsavedChanges ? "Save project" : "Saved"}
          </Button>
        </>
      }
    >
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
