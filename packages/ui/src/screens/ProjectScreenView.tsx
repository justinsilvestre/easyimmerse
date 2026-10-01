import type { Project, ProjectSettings } from "@easyimmerse/types";
import { type ReactNode, useId } from "react";
import { Button } from "../components/Button.tsx";
import { DictionaryStatus } from "../components/DictionaryStatus.tsx";
import { FlashcardsSummary } from "../components/FlashcardsSummary.tsx";
import { LanguagePair } from "../components/LanguagePair.tsx";
import { MediaList } from "../components/MediaList.tsx";
import { ScreenLayout } from "../components/ScreenLayout.tsx";

/** Shows an open project: its languages, dictionary status, media files, and flashcards. */
export function ProjectScreenView({
  project,
  flashcardCount,
  dictionaryStatus,
  onBack,
  onOpenMedia,
  onAddMedia,
  onRemoveMedia,
  onEditSettings,
  onSetUpDictionaries,
  onExportAnkiPackage,
  onSetUpAnkiConnect,
  onStartReview,
  headerActions,
}: {
  project: Project;
  flashcardCount: number;
  dictionaryStatus: "ready" | "missing" | "unknown";
  onBack: () => void;
  onOpenMedia: (mediaId: string) => void;
  onAddMedia: () => void;
  onRemoveMedia: (mediaId: string) => void;
  onEditSettings: () => void;
  onSetUpDictionaries: () => void;
  onExportAnkiPackage: () => void;
  onSetUpAnkiConnect: () => void;
  onStartReview: () => void;
  headerActions?: ReactNode;
}) {
  const mediaHeadingId = useId();
  return (
    <ScreenLayout headerActions={headerActions}>
      <ProjectScreenTitle
        settings={project.settings}
        onBack={onBack}
        onEditSettings={onEditSettings}
      >
        <DictionaryStatus
          status={dictionaryStatus}
          targetLanguage={project.settings.target_language}
          onSetUpDictionaries={onSetUpDictionaries}
        />
      </ProjectScreenTitle>
      <section aria-labelledby={mediaHeadingId} className="flex flex-col gap-4">
        <div className="flex items-center justify-between gap-4">
          <h2 id={mediaHeadingId} className="text-lg font-semibold">
            Media
          </h2>
          <Button variant="primary" onClick={onAddMedia}>
            Add media
          </Button>
        </div>
        <MediaList
          media={project.media}
          onOpenMedia={onOpenMedia}
          onRemoveMedia={onRemoveMedia}
        />
      </section>
      <FlashcardsSummary
        count={flashcardCount}
        onExportAnkiPackage={onExportAnkiPackage}
        onSetUpAnkiConnect={onSetUpAnkiConnect}
        onStartReview={onStartReview}
      />
    </ScreenLayout>
  );
}

function ProjectScreenTitle({
  settings,
  onBack,
  onEditSettings,
  children,
}: {
  settings: ProjectSettings;
  onBack: () => void;
  onEditSettings: () => void;
  children: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-4">
      <Button variant="subtle" onClick={onBack} className="-mx-3 self-start">
        <span aria-hidden="true">←</span> All projects
      </Button>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <h1 className="text-2xl font-semibold break-words">
            {settings.name}
          </h1>
          <p className="text-sm text-fg-muted">
            <LanguagePair
              targetLanguage={settings.target_language}
              translationLanguage={settings.translation_language}
            />
          </p>
        </div>
        <Button onClick={onEditSettings}>Settings</Button>
      </div>
      {children}
    </div>
  );
}
