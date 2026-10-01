import type { MediaKind } from "@easyimmerse/types";
import clsx from "clsx";

/** A decorative line icon for a kind of media: a play screen for video, a musical note for audio, a page for documents. */
export function MediaKindIcon({
  kind,
  className,
}: {
  kind: MediaKind;
  className?: string;
}) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={clsx("size-5", className)}
    >
      {kind === "video" && (
        <>
          <rect x="3" y="5" width="18" height="14" rx="2" />
          <path d="M10 9.5v5l4.5-2.5z" />
        </>
      )}
      {kind === "audio" && (
        <>
          <path d="M9 18V5l11-2v13" />
          <circle cx="6.5" cy="18" r="2.5" />
          <circle cx="17.5" cy="16" r="2.5" />
        </>
      )}
      {kind === "document" && (
        <>
          <path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z" />
          <path d="M14 3v5h5M9 13h6M9 17h6" />
        </>
      )}
    </svg>
  );
}
