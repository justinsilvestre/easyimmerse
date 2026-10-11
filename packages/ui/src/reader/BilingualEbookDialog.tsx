import type { InstalledPlugin } from "@easyimmerse/types";
import { Button } from "../components/Button.tsx";
import { ModalDialog } from "../components/ModalDialog.tsx";

/**
 * Explains what combining a book with its translation into a bilingual ebook needs: an alignment provider,
 * which matches each sentence of the book with its translation.
 * The easyImmerse cloud does not exist yet, and this version cannot run alignment plugins,
 * so the dialog says how to get a provider, and that a plugin it found cannot run yet. No alignment is started.
 */
export function BilingualEbookDialog({
  alignmentPlugins,
  onClose,
}: {
  /** The installed plugins that provide alignments, or null while the plugins are being listed. */
  alignmentPlugins: readonly InstalledPlugin[] | null;
  onClose: () => void;
}) {
  const [found] = alignmentPlugins ?? [];
  return (
    <ModalDialog
      title="Combine into a bilingual ebook"
      onCancel={onClose}
      footer={
        <Button variant="primary" autoFocus onClick={onClose}>
          OK
        </Button>
      }
    >
      {alignmentPlugins === null ? (
        <p className="text-sm text-fg-muted">Looking for alignment plugins…</p>
      ) : found ? (
        <p role="status" className="text-sm text-fg-soft">
          The alignment plugin “{found.title}” is installed, but this version of
          easyImmerse cannot run alignment plugins yet.
        </p>
      ) : (
        <div role="status" className="flex flex-col gap-3 text-sm text-fg-soft">
          <p>
            Making a bilingual ebook needs an alignment provider, which matches
            each sentence of the book with its translation. None is available
            yet. You can get one in either of two ways:
          </p>
          <ul className="flex list-disc flex-col gap-1 pl-5">
            <li>
              Subscribe to the easyImmerse cloud, which aligns books for you.
            </li>
            <li>Install an alignment plugin in the easyImmerse desktop app.</li>
          </ul>
        </div>
      )}
    </ModalDialog>
  );
}
