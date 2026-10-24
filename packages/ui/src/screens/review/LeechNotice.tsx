import { Bug } from "lucide-react";
import { Button } from "../../components/common/Button.tsx";

/** Flags a leech above its card: a card the user keeps forgetting, which costs more reviews than it is worth. It offers to suspend the card. */
export function LeechNotice({
  lapseCount,
  onSuspend,
}: {
  /** The number of times the user forgot the card after learning it. */
  lapseCount: number;
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
          You have forgotten this card {lapseCount} times. You can suspend it to
          stop reviewing it.
        </span>
      </p>
      <Button variant="secondary" className="shrink-0" onClick={onSuspend}>
        Suspend
      </Button>
    </aside>
  );
}
