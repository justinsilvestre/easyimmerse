import type { Alignment, AlignmentContent } from "@easyimmerse/types";

export type AudioAlignmentContent = Extract<
  AlignmentContent,
  { kind: "audio" }
>;

export type TranslationAlignmentContent = Extract<
  AlignmentContent,
  { kind: "translation" }
>;

/** The alignment of each kind the reader uses, or null when the document has none of that kind. */
export type LatestAlignments = {
  audio: AudioAlignmentContent | null;
  translation: TranslationAlignmentContent | null;
};

/**
 * The content of the newest audio alignment and the newest translation alignment, by creation time.
 * Of two equally new alignments, the one listed first wins, as the server lists the newest first.
 */
export function latestAlignments(
  alignments: readonly Alignment[],
): LatestAlignments {
  return {
    audio: newestContent(alignments, isAudio),
    translation: newestContent(alignments, isTranslation),
  };
}

function newestContent<T extends AlignmentContent>(
  alignments: readonly Alignment[],
  isKind: (content: AlignmentContent) => content is T,
): T | null {
  let newest: { createdAtMs: number; content: T } | null = null;
  for (const { content, created_at_ms } of alignments) {
    if (
      isKind(content) &&
      (newest === null || created_at_ms > newest.createdAtMs)
    )
      newest = { createdAtMs: created_at_ms, content };
  }
  return newest?.content ?? null;
}

function isAudio(content: AlignmentContent): content is AudioAlignmentContent {
  return content.kind === "audio";
}

function isTranslation(
  content: AlignmentContent,
): content is TranslationAlignmentContent {
  return content.kind === "translation";
}
