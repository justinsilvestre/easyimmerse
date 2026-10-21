import { Bug } from "lucide-react";
import { Button } from "../components/Button.tsx";

/**
 * Flags a leech above its card: a card the user keeps forgetting, which costs more reviews than it is worth as it stands.
 * It offers the two ways out that Anki suggests, editing the card to make it easier to remember or suspending it.
 */
export function LeechNotice({
  lapseCount,
  onEdit,
  onSuspend,
}: {
  /** The number of times the user forgot the card after learning it. */
  lapseCount: number;
  /** Opens the card in the editor. Null leaves the button out, as for a card whose media file is gone. */
  onEdit: (() => void) | null;
  onSuspend: () => void;
}) {
  return (
    <aside
      aria-label="Leech"
      className="flex w-full max-w-xl flex-col gap-2 self-center rounded-xl bg-warning-soft px-4 py-3 text-sm text-warning-fg sm:flex-row sm:items-center sm:justify-between"
    >
      <p className="flex items-start gap-2">
        <Bug className="mt-0.5 size-4 shrink-0" aria-hidden />
        <span>
          You have forgotten this card {lapseCount} times.{" "}
          {onEdit
            ? "Try editing it to make it easier to remember, or suspend it."
            : "You can suspend it to stop reviewing it."}
        </span>
      </p>
      <div className="flex shrink-0 gap-2">
        {onEdit && (
          <Button variant="secondary" onClick={onEdit}>
            Edit
          </Button>
        )}
        <Button variant="secondary" onClick={onSuspend}>
          Suspend
        </Button>
      </div>
    </aside>
  );
}
