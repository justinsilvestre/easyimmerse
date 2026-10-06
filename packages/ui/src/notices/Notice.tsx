import clsx from "clsx";
import { AlertTriangle, Check, Clock, Info, X } from "lucide-react";
import { Button } from "../components/Button.tsx";
import { IconButton } from "../components/IconButton.tsx";

/** How a notice looks: what kind of news it brings. */
export type NoticeTone = "info" | "success" | "waiting" | "danger";

/** Something the user can do about a notice, such as Undo or Retry. Choosing it dismisses the notice. */
export type NoticeAction = { label: string; onSelect: () => void };

/**
 * A short message with the actions that answer it and a Dismiss button.
 * It is not itself a live region; whatever shows it announces it.
 */
export function Notice({
  tone,
  message,
  actions = [],
  onDismiss,
}: {
  tone: NoticeTone;
  message: string;
  actions?: readonly NoticeAction[];
  onDismiss: () => void;
}) {
  return (
    <div
      className={clsx(
        "flex max-w-md items-center gap-2 rounded-lg border px-3 py-2 text-sm shadow-md",
        tone === "danger" && "border-danger-line bg-danger-soft text-danger-fg",
        tone === "waiting" &&
          "border-warning-line bg-warning-soft text-warning-fg",
        (tone === "info" || tone === "success") &&
          "border-line bg-surface text-fg",
      )}
    >
      <ToneIcon tone={tone} />
      <span className="flex-1">{message}</span>
      {actions.map((action) => (
        <Button key={action.label} size="sm" onClick={action.onSelect}>
          {action.label}
        </Button>
      ))}
      <IconButton label="Dismiss" onClick={onDismiss}>
        <X className="size-4" />
      </IconButton>
    </div>
  );
}

function ToneIcon({ tone }: { tone: NoticeTone }) {
  const className = "size-4 shrink-0";
  switch (tone) {
    case "success":
      return (
        <Check className={clsx(className, "text-success-fg")} aria-hidden />
      );
    case "waiting":
      return <Clock className={className} aria-hidden />;
    case "danger":
      return <AlertTriangle className={className} aria-hidden />;
    case "info":
      return <Info className={className} aria-hidden />;
  }
}
