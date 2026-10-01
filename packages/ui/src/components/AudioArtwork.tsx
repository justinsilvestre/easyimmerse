/** A square placeholder shown in place of a picture for audio. */
export function AudioArtwork() {
  return (
    <div
      role="img"
      aria-label="Audio artwork"
      className="flex aspect-square w-40 items-center justify-center rounded-xl bg-linear-to-br from-indigo-500 via-violet-600 to-fuchsia-600 shadow-lg sm:w-56"
    >
      <svg
        viewBox="0 0 24 24"
        aria-hidden="true"
        className="w-2/5 fill-white/90 drop-shadow"
      >
        <path d="M12 3v10.55A4 4 0 1 0 14 17V7h4V3h-6z" />
      </svg>
    </div>
  );
}
