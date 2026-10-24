import type { ReactNode } from "react";

/** Says what waits in the Anki updates queue, captioning the preview of the next card when there is one. */
export function QueueSummary({
  summary,
  preview,
}: {
  summary: ReactNode;
  preview: ReactNode;
}) {
  if (preview === null) return <p className="text-center">{summary}</p>;
  return (
    <figure className="flex w-full flex-col gap-1.5">
      <figcaption className="text-center">{summary}</figcaption>
      {preview}
    </figure>
  );
}
