import { Button } from "../components/Button.tsx";

/** Says that the flashcard is suspended and left out of reviews, with the way to bring it back. */
export function SuspendedStrip({ onUnsuspend }: { onUnsuspend: () => void }) {
  return (
    <div className="flex items-center justify-between gap-2 border-b border-line bg-surface-muted px-4 py-1.5 text-sm text-fg-muted">
      <p>This card won't show up in reviews until you unsuspend it.</p>
      <Button variant="subtle" onClick={onUnsuspend}>
        Unsuspend
      </Button>
    </div>
  );
}
