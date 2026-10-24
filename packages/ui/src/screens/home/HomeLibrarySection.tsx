import { Library, Settings2 } from "lucide-react";
import { Button } from "../../components/common/Button.tsx";

/** The home screen's way into the server's library, with the way to manage it for someone who may. */
export function HomeLibrarySection({
  onOpenLibrary,
  onManageLibrary,
}: {
  onOpenLibrary: () => void;
  /** Opens the library management screen. Null for someone who cannot manage the library. */
  onManageLibrary: (() => void) | null;
}) {
  return (
    <section
      aria-label="Library"
      className="flex flex-col gap-3 rounded-lg border border-line bg-surface p-4 sm:flex-row sm:items-center sm:justify-between"
    >
      <div className="flex items-start gap-3">
        <Library className="mt-0.5 size-5 shrink-0 text-fg-muted" aria-hidden />
        <div className="flex flex-col gap-1">
          <h2 className="font-semibold">Library</h2>
          <p className="text-sm text-fg-muted">
            Videos, audio, and texts prepared on this server, ready to add to
            your projects.
          </p>
        </div>
      </div>
      <div className="flex shrink-0 flex-wrap gap-2">
        {onManageLibrary && (
          <Button onClick={onManageLibrary}>
            <Settings2 className="size-4" aria-hidden />
            Manage library
          </Button>
        )}
        <Button onClick={onOpenLibrary}>Browse the library</Button>
      </div>
    </section>
  );
}
