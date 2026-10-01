import type { Ref } from "react";

/** An icon button that starts removing a media file from the project. */
export function MediaListRemoveButton({
  ref,
  mediaName,
  onClick,
}: {
  ref: Ref<HTMLButtonElement>;
  mediaName: string;
  onClick: () => void;
}) {
  const label = `Remove ${mediaName}`;
  return (
    <button
      ref={ref}
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      className="relative z-10 shrink-0 rounded-md p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-700 focus-visible:outline-2 focus-visible:outline-blue-600"
    >
      <svg
        aria-hidden="true"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={1.75}
        strokeLinecap="round"
        strokeLinejoin="round"
        className="size-5"
      >
        <path d="M4 7h16M10 11v6M14 11v6M6 7l1 12a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-12M9 7V4h6v3" />
      </svg>
    </button>
  );
}
