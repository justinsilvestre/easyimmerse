import type { WordHover } from "@easyimmerse/state";
import { actions, selectReader } from "@easyimmerse/state";
import type { MediaFile } from "@easyimmerse/types";
import { useAppDispatch } from "../hooks/useAppDispatch.ts";
import { useAppSelector } from "../hooks/useAppSelector.ts";
import { useDocument } from "../hooks/useDocument.ts";
import { DocumentReader } from "../reader/DocumentReader.tsx";

const startOfDocument = { chapterIndex: 0, paragraphIndex: 0 };

/** Shows the open document in the reader once it is parsed. */
export function MediaScreenReader({
  media,
  onWordActivated,
}: {
  media: MediaFile;
  onWordActivated: (hover: WordHover) => void;
}) {
  const dispatch = useAppDispatch();
  const { document, error } = useDocument(media);
  const position = useAppSelector((state) => selectReader(state).position);
  if (error !== null)
    return (
      <p role="alert" className="bg-red-50 px-4 py-2 text-sm text-red-800">
        Could not open the document: {error}
      </p>
    );
  if (document === null)
    return (
      <p role="status" className="p-8 text-center text-sm text-neutral-400">
        Opening the document…
      </p>
    );
  return (
    <DocumentReader
      document={document}
      position={position ?? startOfDocument}
      onPositionChanged={(next) =>
        dispatch(actions.readingPositionChanged(media.id, next))
      }
      onWordHovered={({ word, context }) =>
        dispatch(actions.wordHovered({ word, context, clip: null }))
      }
      onWordActivated={({ word, context }) =>
        onWordActivated({ word, context, clip: null })
      }
    />
  );
}
