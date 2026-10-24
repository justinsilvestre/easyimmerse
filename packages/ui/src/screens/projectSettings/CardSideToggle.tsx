import clsx from "clsx";

/**
 * A small button beside a field's checkbox that says whether the field is on the front or the back of a card,
 * and moves it to the other side when pressed.
 */
export function CardSideToggle({
  fieldLabel,
  isFront,
  onToggle,
}: {
  /** The field's name, which screen readers hear before its side. */
  fieldLabel: string;
  isFront: boolean;
  onToggle: () => void;
}) {
  const side = isFront ? "front" : "back";
  return (
    <button
      type="button"
      aria-label={`${fieldLabel} on the ${side}`}
      title={`Move to the ${isFront ? "back" : "front"}`}
      onClick={onToggle}
      className={clsx(
        "shrink-0 rounded-full border px-1.5 py-px text-[0.65rem] font-medium tracking-wide uppercase focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-accent",
        isFront
          ? "border-transparent bg-accent-soft text-accent-fg hover:bg-accent hover:text-on-accent"
          : "border-line-strong text-fg-muted hover:bg-surface-muted hover:text-fg",
      )}
    >
      {isFront ? "Front" : "Back"}
    </button>
  );
}
