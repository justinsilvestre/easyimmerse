/** Draws audio peaks, each between 0 and 1, as bars mirrored around the middle. */
export function Peaks({ peaks }: { peaks: readonly number[] }) {
  const barWidth = 1000 / peaks.length;
  return (
    <svg
      aria-hidden
      viewBox="0 0 1000 100"
      preserveAspectRatio="none"
      className="h-full w-full text-fg-faint"
    >
      {peaks.map((peak, index) => (
        <rect
          // Peaks never reorder, so the position is the identity.
          key={index.toString()}
          x={index * barWidth}
          y={50 - peak * 48}
          width={barWidth * 0.7}
          height={peak * 96}
          fill="currentColor"
        />
      ))}
    </svg>
  );
}
