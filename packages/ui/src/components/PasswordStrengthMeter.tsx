import type {
  PasswordStrength,
  PasswordStrengthLevel,
} from "@easyimmerse/state";
import clsx from "clsx";

const levelLabels = {
  tooShort: "Too short",
  weak: "Weak",
  fair: "Fair",
  strong: "Strong",
} satisfies Record<PasswordStrengthLevel, string>;

const levelFills = {
  tooShort: "bg-danger-fg",
  weak: "bg-danger-fg",
  fair: "bg-warning-fg",
  strong: "bg-success-fg",
} satisfies Record<PasswordStrengthLevel, string>;

const segments = [0, 1, 2, 3];

/** Shows a password's strength as a four-segment meter with its level in words, and lists how to make it stronger. */
export function PasswordStrengthMeter({
  strength,
}: {
  strength: PasswordStrength;
}) {
  const label = levelLabels[strength.level];
  return (
    <div className="flex flex-col gap-1">
      <meter
        aria-label="Password strength"
        aria-valuetext={label}
        min={0}
        max={3}
        value={strength.score}
        className="sr-only"
      />
      <div aria-hidden className="flex gap-1">
        {segments.map((segment) => (
          <span
            key={segment}
            className={clsx(
              "h-1 flex-1 rounded-full",
              segment <= strength.score
                ? levelFills[strength.level]
                : "bg-surface-strong",
            )}
          />
        ))}
      </div>
      <p className="text-xs font-medium text-fg-soft">{label}</p>
      {strength.advice.length > 0 && (
        <ul className="flex flex-col gap-0.5 text-xs text-fg-muted">
          {strength.advice.map((step) => (
            <li key={step}>{step}</li>
          ))}
        </ul>
      )}
    </div>
  );
}
