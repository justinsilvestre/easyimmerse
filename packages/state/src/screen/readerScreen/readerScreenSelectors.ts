import type { MediaFile } from "@easyimmerse/types";
import type { AppState } from "../../app/appState.ts";
import type { AppRoot, RootState } from "../../app/createAppStore.ts";
import {
  type ReaderPreferences,
  selectReaderPreferences,
} from "../../preferences/readerPreferences.ts";
import type { MediaRoute } from "../../route/route.ts";
import { cacheEntry, type ServerCacheSlice } from "../../server/cacheEntry.ts";
import {
  selectFlashcardForm,
  selectMediaScreen,
} from "../mediaScreen/mediaScreenSelectors.ts";
import { latestAlignments } from "./latestAlignments.ts";
import {
  initialReaderScreen,
  type ReaderScreenState,
  type ReaderTranslationStatus,
  type ReaderViewMode,
} from "./readerScreenState.ts";

/** Returns the reader's state, or its defaults while no media screen is open. */
export const selectReaderScreen = (state: AppRoot): ReaderScreenState =>
  state.app.screen.main.kind === "media"
    ? state.app.screen.main.reader
    : initialReaderScreen;

/** Tells whether one of the reader's panels, or the flashcard editor beside the text, is open. */
export function selectIsReaderPanelOpen(
  app: Pick<AppState, "route" | "screen">,
): boolean {
  const panel = selectMediaScreen(app)?.screen.reader.panel ?? null;
  return panel !== null || selectFlashcardForm(app) !== null;
}

/**
 * Returns how far the open book's translation is ready to be shown, from the server cache: absent while no translation
 * is paired with the book or its text is not cached, unaligned once its text is cached, and aligned once the book's newest
 * translation alignment is with it. Absent while no media screen is open.
 */
export function selectReaderTranslationStatus(
  root: RootState,
): ReaderTranslationStatus {
  const route = selectMediaScreen(root.app)?.route;
  const paired = route ? cachedPairedTranslation(root.backend, route) : null;
  if (paired === null) return "absent";
  const { name, source } = paired;
  if (
    cacheEntry(root.backend, "openBook", { name, source })?.data === undefined
  )
    return "absent";
  return cachedIsAlignedWith(root.backend, route, paired.id)
    ? "aligned"
    : "unaligned";
}

/** Returns the media file paired with the book as its translation, among the project's cached media files, or null. */
function cachedPairedTranslation(
  backend: ServerCacheSlice,
  { projectId, mediaFileId }: MediaRoute,
): MediaFile | null {
  const files = cacheEntry(backend, "listMediaFiles", projectId)?.data
    ?.media_files;
  const book = files?.find(({ id }) => id === mediaFileId);
  const pairedId = book?.translation_media_file_id;
  return (pairedId && files?.find(({ id }) => id === pairedId)) || null;
}

/** Tells whether the book's newest cached translation alignment is with the given translation. */
function cachedIsAlignedWith(
  backend: ServerCacheSlice,
  route: MediaRoute | undefined,
  translationId: string,
): boolean {
  const { projectId, mediaFileId } = route ?? {};
  if (projectId === undefined || mediaFileId === undefined) return false;
  const alignments =
    cacheEntry(backend, "listAlignments", { projectId, mediaFileId })?.data
      ?.alignments ?? [];
  return (
    latestAlignments(alignments).translation?.translation_media_file_id ===
    translationId
  );
}

/** Returns the view the reader shows, as `shownReaderViewMode` describes, or the book alone while no media screen is open. */
export function selectShownReaderViewMode(root: RootState): ReaderViewMode {
  return shownReaderViewMode(
    selectReaderScreen(root).viewMode,
    selectReaderTranslationStatus(root),
  );
}

/**
 * The view the reader shows: the one chosen once the translation it needs is ready, or else the book alone.
 * The translation-only view needs the translation loaded, and the views that show both texts need it aligned with the book.
 */
export function shownReaderViewMode(
  chosen: ReaderViewMode,
  translationStatus: ReaderTranslationStatus,
): ReaderViewMode {
  return viewModesReady[translationStatus].includes(chosen) ? chosen : "target";
}

const viewModesReady: Record<
  ReaderTranslationStatus,
  readonly ReaderViewMode[]
> = {
  absent: ["target"],
  unaligned: ["target", "translation"],
  aligned: ["target", "translation", "interlinear", "parallel"],
};

/** Tells whether the reader lays the text out in pages rather than in one scrolling column, in the view it shows, as `isReaderPaged` decides. */
export function selectIsReaderPaged(root: RootState): boolean {
  return isReaderPaged(
    selectReaderPreferences(root.app).layout,
    selectShownReaderViewMode(root),
  );
}

/**
 * Whether the reader lays the text out in pages, in the layout the preferences choose, for the text it shows.
 * The parallel view always scrolls: each of its rows pairs a paragraph with its translation side by side,
 * and the paged layout's CSS columns cannot split such a row between pages, so a long row would be cut off at the page's foot.
 */
export function isReaderPaged(
  layout: ReaderPreferences["layout"],
  viewMode: ReaderViewMode,
): boolean {
  return layout === "pages" && viewMode !== "parallel";
}
