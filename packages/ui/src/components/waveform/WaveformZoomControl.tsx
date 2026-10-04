/** Two small buttons in the strip's corner that step the zoom, disabled at the limits. */
export function WaveformZoomControl({
  canZoomIn,
  canZoomOut,
  onZoomIn,
  onZoomOut,
}: {
  canZoomIn: boolean;
  canZoomOut: boolean;
  onZoomIn: () => void;
  onZoomOut: () => void;
}) {
  return (
    <fieldset
      aria-label="Waveform zoom"
      className="absolute top-1 right-1 flex gap-px opacity-50 transition-opacity hover:opacity-100 focus-within:opacity-100 motion-reduce:transition-none"
    >
      <ZoomButton label="Zoom out" disabled={!canZoomOut} onClick={onZoomOut}>
        −
      </ZoomButton>
      <ZoomButton label="Zoom in" disabled={!canZoomIn} onClick={onZoomIn}>
        +
      </ZoomButton>
    </fieldset>
  );
}

function ZoomButton({
  label,
  disabled,
  onClick,
  children,
}: {
  label: string;
  disabled: boolean;
  onClick: () => void;
  children: string;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
      className="size-6 rounded bg-gray-700 font-mono text-sm text-gray-100 hover:bg-gray-600 disabled:cursor-default disabled:opacity-40 disabled:hover:bg-gray-700 focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-white"
    >
      {children}
    </button>
  );
}
