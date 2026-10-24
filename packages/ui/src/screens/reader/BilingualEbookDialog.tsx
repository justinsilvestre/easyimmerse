import type { InstalledPlugin } from "@easyimmerse/types";
import { Button } from "../../components/common/Button.tsx";
import { ModalDialog } from "../../components/common/ModalDialog.tsx";

/**
 * Tells that a book cannot yet be combined with its translation into a bilingual ebook,
 * since easyImmerse cannot yet match each sentence of the book with its translation,
 * and, when an alignment plugin is installed, that this version cannot run it. No alignment is started.
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
          easyImmerse cannot run alignment plugins yet, so a bilingual ebook
          cannot be made for now.
        </p>
      ) : (
        <p role="status" className="text-sm text-fg-soft">
          A bilingual ebook needs each sentence of the book matched with its
          translation. easyImmerse cannot match them yet, so a bilingual ebook
          cannot be made for now.
        </p>
      )}
    </ModalDialog>
  );
}
