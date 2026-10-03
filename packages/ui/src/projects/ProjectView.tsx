import { ArrowLeft, Plus, Save, Settings } from "lucide-react";
import { Button } from "../components/Button.tsx";
import { EmptyState } from "../components/EmptyState.tsx";
import { ScreenLayout } from "../components/ScreenLayout.tsx";
import type { FlashcardFieldKey } from "../flashcards/flashcardFields.ts";
import {
  DictionaryStatus,
  type LanguageDictionaryStatus,
} from "./DictionaryStatus.tsx";
import {
  FlashcardSyncPanel,
  type FlashcardSyncState,
} from "./FlashcardSyncPanel.tsx";
import { type MediaItem, MediaList } from "./MediaList.tsx";

/** The project screen: its media, where its flashcards go, and the dictionaries it relies on. */
export function ProjectView({
  name,
  media,
  dictionaries,
  flashcardSync,
  includedFields,
  hasUnsavedChanges,
  onBack,
  onSave,
  onEditSettings,
  onAddMedia,
  onOpenMedia,
  onOpenDictionaries,
  onExportPackage,
  onSetUpAnkiConnect,
  onStartReview,
  onSendToAnki,
}: {
  name: string;
  media: readonly MediaItem[];
  dictionaries: readonly LanguageDictionaryStatus[];
  flashcardSync: FlashcardSyncState;
  includedFields: readonly FlashcardFieldKey[];
  hasUnsavedChanges: boolean;
  onBack: () => void;
  onSave: () => void;
  onEditSettings: () => void;
  onAddMedia: () => void;
  onOpenMedia: (mediaId: string) => void;
  onOpenDictionaries: () => void;
  onExportPackage: () => void;
  onSetUpAnkiConnect: () => void;
  onStartReview: () => void;
  onSendToAnki: () => void;
}) {
  return (
    <ScreenLayout
      headerActions={
        <>
          <Button variant="subtle" onClick={onBack}>
            <ArrowLeft className="size-4" aria-hidden />
            Projects
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
        <h1 className="text-xl font-semibold">{name}</h1>
        <Button variant="subtle" onClick={onEditSettings}>
          <Settings className="size-4" aria-hidden />
          Settings
        </Button>
      </div>
      <section className="flex flex-col gap-3">
        <div className="flex items-center justify-between gap-3">
          <h2 className="font-semibold">Media</h2>
          {media.length > 0 && (
            <Button onClick={onAddMedia}>
              <Plus className="size-4" aria-hidden />
              Add media
            </Button>
          )}
        </div>
        {media.length === 0 ? (
          <EmptyState
            title="No media yet"
            description="Add a video, an audio file, or an ebook in the project's language."
            actions={
              <Button variant="primary" onClick={onAddMedia}>
                <Plus className="size-4" aria-hidden />
                Add media
              </Button>
            }
          />
        ) : (
          <MediaList media={media} onOpen={onOpenMedia} />
        )}
      </section>
      <FlashcardSyncPanel
        state={flashcardSync}
        includedFields={includedFields}
        onExportPackage={onExportPackage}
        onSetUpAnkiConnect={onSetUpAnkiConnect}
        onStartReview={onStartReview}
        onSendToAnki={onSendToAnki}
      />
      <DictionaryStatus
        statuses={dictionaries}
        onOpenDictionaries={onOpenDictionaries}
      />
    </ScreenLayout>
  );
}
