import type { PitchAccent } from "@easyimmerse/types";
import {
  type PitchLevel,
  pitchPattern,
  splitIntoMorae,
} from "./pitchPattern.ts";

/**
 * Shows the pitch accent of a reading: a line over each high mora, with a drop at the downstep, followed by the pattern in H and L.
 * Devoiced morae are dimmed, and nasal morae carry a semi-voiced mark.
 */
export function PitchAccentView({
  reading,
  accent,
}: {
  reading: string;
  accent: PitchAccent;
}) {
  const morae = splitIntoMorae(reading);
  const levels = pitchPattern(accent.position, morae.length);
  return (
    <span className="inline-flex items-center gap-1.5">
      <span lang="ja" className="inline-flex pt-0.5">
        {morae.map((mora, index) => {
          const position = index + 1;
          return (
            <span
              // Morae never reorder.
              // biome-ignore lint/suspicious/noArrayIndexKey: see above
              key={index}
              data-pitch={levels[index]}
              data-downstep={isDownstep(levels, index) || undefined}
              data-devoiced={accent.devoice.includes(position) || undefined}
              className="border-fg-muted px-px data-devoiced:text-fg-faint data-downstep:border-r data-[pitch=H]:border-t"
            >
              {accent.nasal.includes(position) ? nasalMora(mora) : mora}
            </span>
          );
        })}
      </span>
      <span className="font-mono text-xs text-fg-muted">
        {typeof accent.position === "number" && `[${accent.position}] `}
        {levels.join("")}
      </span>
      {accent.tags.length > 0 && (
        <span className="text-xs text-fg-faint">{accent.tags.join(", ")}</span>
      )}
    </span>
  );
}

function isDownstep(levels: readonly PitchLevel[], index: number): boolean {
  return levels[index] === "H" && levels[index + 1] === "L";
}

/** Marks a mora as nasal the way Japanese dictionaries do, with a semi-voiced mark on its unvoiced kana, as in か゚. */
function nasalMora(mora: string): string {
  return `${mora.normalize("NFD").replace("゙", "")}゚`.normalize("NFC");
}
