import type { ReaderViewMode } from "@easyimmerse/state";
import type { MediaFile } from "@easyimmerse/types";
import { FileText } from "lucide-react";
import { useId } from "react";
import { Button } from "../components/Button.tsx";
import { ReaderSheet } from "./ReaderSheet.tsx";

const viewModeLabels: Record<
  ReaderViewMode,
  { label: string; description: string }
> = {
  target: { label: "Original", description: "The book alone" },
  translation: { label: "Translation", description: "The translation alone" },
  interlinear: {
    label: "Interlinear",
    description: "Each sentence over its translation",
  },
  parallel: {
    label: "Parallel",
    description: "The book and its translation side by side",
  },
};

/**
 * The panel where the book is paired with its translation, another ebook or text file of the project, and where the view is chosen:
 * the book alone or its translation alone, and once the two are aligned, both together, interlinear or in parallel.
 * Until they are aligned, it offers to combine them into a bilingual ebook.
 */
export function TranslationPanel({
  candidates,
  paired,
  isAligned,
  viewMode,
  viewModes,
  onChoose,
  onViewModeChange,
  onCombine,
  onClose,
}: {
  /** The project's other ebooks and text files. */
  candidates: readonly MediaFile[];
  /** The translation the book is paired with, or null when it has none. */
  paired: MediaFile | null;
  /** Whether the book has been aligned with its translation. */
  isAligned: boolean;
  viewMode: ReaderViewMode;
  /** The views offered, in order. */
  viewModes: readonly ReaderViewMode[];
  onChoose: (mediaFileId: string | null) => void;
  onViewModeChange: (viewMode: ReaderViewMode) => void;
  onCombine: () => void;
  onClose: () => void;
}) {
  const name = useId();
  return (
    <ReaderSheet title="Translation" placement="card" onClose={onClose}>
      <div className="flex flex-col gap-4 overflow-y-auto px-4 pt-2 pb-4 text-sm">
        {paired ? (
          <>
            <div className="flex items-center gap-2">
              <FileText className="size-4 shrink-0 text-fg-muted" aria-hidden />
              <span className="min-w-0 flex-1 truncate" title={paired.name}>
                {paired.name}
              </span>
              <Button variant="subtle" size="sm" onClick={() => onChoose(null)}>
                Remove
              </Button>
            </div>
            <fieldset className="flex flex-col gap-1">
              <legend className="mb-1.5 text-fg-muted">Show</legend>
              {viewModes.map((mode) => (
                <label
                  key={mode}
                  className="flex cursor-pointer items-baseline gap-2 rounded-md px-2 py-1.5 hover:bg-surface-muted has-checked:bg-accent-soft has-focus-visible:outline-2 has-focus-visible:outline-accent"
                >
                  <input
                    type="radio"
                    name={name}
                    value={mode}
                    checked={mode === viewMode}
                    onChange={() => onViewModeChange(mode)}
                    className="translate-y-0.5 accent-accent"
                  />
                  <span className="flex flex-col">
                    <span className="font-medium">
                      {viewModeLabels[mode].label}
                    </span>
                    <span className="text-xs text-fg-muted">
                      {viewModeLabels[mode].description}
                    </span>
                  </span>
                </label>
              ))}
            </fieldset>
            {!isAligned && (
              <div className="flex flex-col gap-2">
                <p className="text-fg-muted">
                  To read the two together, sentence by sentence, combine them
                  into a bilingual ebook.
                </p>
                <Button className="self-start" onClick={onCombine}>
                  Combine into a bilingual ebook
                </Button>
              </div>
            )}
          </>
        ) : candidates.length > 0 ? (
          <>
            <p className="text-fg-muted">
              Choose the translation of this book among the project's ebooks and
              text files.
            </p>
            <ul className="flex flex-col gap-1">
              {candidates.map((candidate) => (
                <li key={candidate.id}>
                  <button
                    type="button"
                    className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left hover:bg-surface-muted focus-visible:outline-2 focus-visible:outline-accent"
                    onClick={() => onChoose(candidate.id)}
                  >
                    <FileText
                      className="size-4 shrink-0 text-fg-muted"
                      aria-hidden
                    />
                    <span className="min-w-0 truncate">{candidate.name}</span>
                  </button>
                </li>
              ))}
            </ul>
          </>
        ) : (
          <p className="text-fg-muted">
            This project has no other ebook or text file. Add the translation to
            the project to read it beside this book.
          </p>
        )}
      </div>
    </ReaderSheet>
  );
}
