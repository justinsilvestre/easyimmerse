import type { LibraryLanguageForm as LanguageFormStage } from "@easyimmerse/state";
import type { LibraryItem } from "@easyimmerse/types";
import { Button } from "../../components/common/Button.tsx";
import { LibraryItemCard } from "../../components/libraryItemCard/LibraryItemCard.tsx";
import { ScreenLayout } from "../../layout/ScreenLayout.tsx";
import { languageName } from "../../lib/formatting/languages.ts";
import type { LibraryListStatus } from "../../lib/library/LibraryListStatus.ts";
import { LibraryLanguageForm } from "./LibraryLanguageForm.tsx";
import {
  NewLibraryMediaForm,
  type NewLibraryMediaStatus,
} from "./NewLibraryMediaForm.tsx";

/**
 * The library management screen: the library's language, the way to add media to the library,
 * and every item of the library, published or not, with its status.
 * While the library has no language, a form to set it takes the place of the way to add media.
 */
export function LibraryManagementView({
  status,
  language,
  languageForm,
  items,
  coverUrlOf,
  addStatus,
  onSetLanguage,
  onChangeLanguage,
  onAddMedia,
  onEditItem,
  onBack,
}: {
  status: LibraryListStatus;
  /** The library's language, or null while it has none. */
  language: string | null;
  languageForm: LanguageFormStage;
  items: readonly LibraryItem[];
  coverUrlOf: (item: LibraryItem) => string | null;
  addStatus: NewLibraryMediaStatus;
  onSetLanguage: (language: string) => void;
  /** Opens the form that changes the library's language, or closes it for false. */
  onChangeLanguage: (asks: boolean) => void;
  onAddMedia: (translationLanguage: string) => void;
  onEditItem: (itemId: string) => void;
  onBack: () => void;
}) {
  const showsLanguageForm = language === null || languageForm !== "closed";
  return (
    <ScreenLayout onBack={onBack} backLabel="Library" wide>
      <div className="flex flex-col gap-1">
        <h1 className="text-xl font-semibold">Manage library</h1>
        {status === "ready" && language !== null && (
          <div className="flex flex-wrap items-center gap-2 text-sm text-fg-muted">
            <p>For learners of {languageName(language)}.</p>
            {items.length === 0 && !showsLanguageForm && (
              <Button
                variant="subtle"
                size="sm"
                onClick={() => onChangeLanguage(true)}
              >
                Change
              </Button>
            )}
          </div>
        )}
      </div>
      {status === "ready" &&
        (showsLanguageForm ? (
          <LibraryLanguageForm
            language={language}
            isSaving={languageForm === "saving"}
            onSetLanguage={onSetLanguage}
            onCancel={
              language === null ? undefined : () => onChangeLanguage(false)
            }
          />
        ) : (
          <NewLibraryMediaForm status={addStatus} onAddMedia={onAddMedia} />
        ))}
      {status === "loading" && (
        <p role="status" className="text-sm text-fg-muted">
          Loading the library…
        </p>
      )}
      {status === "failed" && (
        <p role="alert">
          The library couldn't be loaded. Try again in a moment.
        </p>
      )}
      {status === "ready" && items.length === 0 && (
        <p className="text-sm text-fg-muted">The library has no items yet.</p>
      )}
      {items.length > 0 && (
        <ul
          aria-label="Library items"
          className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
        >
          {items.map((item) => (
            <li key={item.id} className="flex">
              <LibraryItemCard
                item={item}
                coverUrl={coverUrlOf(item)}
                showsStatus
                onOpen={onEditItem}
              />
            </li>
          ))}
        </ul>
      )}
    </ScreenLayout>
  );
}
