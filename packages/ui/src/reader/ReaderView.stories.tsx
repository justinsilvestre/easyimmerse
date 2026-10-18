import { useListMediaFilesQuery } from "@easyimmerse/backend";
import {
  type AppAction,
  actions,
  defaultReaderPreferences,
  type ReaderPreferences,
  selectIsReadingLocationLoaded,
  selectPreferencesLoaded,
  selectReaderPreferences,
} from "@easyimmerse/state";
import type {
  Document,
  LookupResult,
  MediaFile,
  Project,
} from "@easyimmerse/types";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { type ComponentProps, useState } from "react";
import { fn } from "storybook/test";
import { exampleLanguages } from "../flashcards/exampleFlashcard.ts";
import { FlashcardEditor } from "../flashcards/FlashcardEditor.tsx";
import { fieldsOfPreset } from "../flashcards/flashcardPresets.ts";
import { UnsavedWorkBanner } from "../flashcards/UnsavedWorkBanner.tsx";
import { useAppDispatch } from "../hooks/useAppDispatch.ts";
import { useAppSelector } from "../hooks/useAppSelector.ts";
import { DictionaryPopup } from "../lookup/DictionaryPopup.tsx";
import { exampleResults } from "../lookup/exampleLookup.ts";
import { resolveExampleMediaUrl } from "../lookup/exampleMedia.ts";
import { exampleTermEntry } from "../lookup/exampleTermEntry.ts";
import type { LookupDisplayState } from "../lookup/lookupDisplayState.ts";
import { languageOptions } from "../projects/languages.ts";
import {
  isWasmBuilt,
  parseDocumentWithWasm,
} from "../storybook/parseDocumentWithWasm.ts";
import { withAppStore } from "../storybook/withAppStore.tsx";
import { withDispatchedActions } from "../storybook/withDispatchedActions.tsx";
import { createFakeBackendClient } from "../testSupport/createFakeBackendClient.ts";
import {
  fixtureProject,
  fixtureResponses,
} from "../testSupport/fixtureResponses.ts";
import { ConnectedReaderView } from "./ConnectedReaderView.tsx";
import { exampleAudioAlignment } from "./exampleAudioAlignment.ts";
import {
  exampleNovel,
  examplePlainText,
  exampleShortBook,
  exampleShortBookAlignment,
  exampleShortBookTranslation,
} from "./exampleDocuments.ts";
import { ReaderAudioBar } from "./ReaderAudioBar.tsx";
import { unwrapHardLineBreaks } from "./unwrapHardLineBreaks.ts";
import { useBookTranslation } from "./useBookTranslation.tsx";
import { useReaderKeyBindings } from "./useReaderKeyBindings.ts";
import type { ReaderWord } from "./useWordPointer.ts";

/**
 * The reader's props apart from those the stories take from the store: its preferences, the controls its keys work,
 * and its translation, which the fake backend's media files and alignments decide.
 */
type ReaderStoryArgs = Omit<
  ComponentProps<typeof ConnectedReaderView>,
  "preferences" | "controls" | "translation"
>;

/** The project the stories read in, whose translations are Spanish. */
const storyProject: Project = {
  ...fixtureProject,
  settings: {
    ...fixtureProject.settings,
    name: "German reading",
    translation_language: "es",
  },
};

/** The media file of the book a story shows, under the id the story stores its place under. */
function bookFileOf(mediaFileId: string, name: string): MediaFile {
  return {
    id: mediaFileId,
    project_id: storyProject.id,
    name,
    source: { kind: "path", path: `/books/${name}` },
    created_at_ms: 0,
    track_selection_json: null,
    origin: null,
    translation_media_file_id: null,
  };
}

/** Enough senses that the pop-up must scroll to show them all. */
const longEntrySenses = [
  "vermin; pests (insects, rodents and the like)",
  "(collective) creatures regarded as harmful to people, crops or livestock",
  "(figurative, derogatory) people regarded as worthless or harmful",
  "(archaic) an unclean animal, unfit for sacrifice",
  "(in Kafka) the unnamed creature Gregor Samsa wakes up as",
  "(agriculture) pests that damage stored grain",
  "(household) insects such as cockroaches, bedbugs and lice",
  "(hunting) small predators that threaten game",
  "(colloquial) a nuisance; something unwanted that keeps coming back",
  "(historical) a term used in propaganda to dehumanize groups of people",
  "(biology, informal) parasites living on a host",
  "(regional) mice and rats in a house or barn",
];

const ungezieferResult: LookupResult = {
  matchedText: "Ungeziefer",
  term: "Ungeziefer",
  reading: null,
  inflectionChains: [],
  definitions: [
    {
      dictionaryId: "wiktionary-de-en",
      dictionaryTitle: "German-English Wiktionary",
      entry: exampleTermEntry({
        term: "Ungeziefer",
        termTags: ["noun"],
        definitions: longEntrySenses.map((text) => ({ kind: "text", text })),
      }),
      tags: [],
    },
  ],
  frequencies: [],
  pronunciations: [],
};

function lookupStateOf(word: string): LookupDisplayState {
  const results = [...exampleResults, ungezieferResult].filter(
    (result) => result.term.toLowerCase() === word.toLowerCase(),
  );
  return results.length > 0
    ? { kind: "found", term: word, results }
    : { kind: "notFound", term: word };
}

function popupFor(word: string, onClose: () => void) {
  return (
    <DictionaryPopup
      state={lookupStateOf(word)}
      mode="word"
      resolveMediaUrl={resolveExampleMediaUrl}
      onSearch={fn()}
      onCreateFlashcard={fn()}
      onClose={onClose}
      onSetUpDictionary={fn()}
    />
  );
}

/**
 * Keeps the preferences in the story's store and the looked-up word in state, so that the appearance controls,
 * the keys and the dictionary pop-up work in every story.
 * A click opens the pop-up on a word, and resting the mouse on another moves it there.
 * "Ungeziefer" and "fressen" have entries.
 * Escape, L and T act on the store's lookup, so they leave alone a pop-up that the story opened itself;
 * R on the word under the mouse goes through the store.
 * The book's translation comes from the fake backend the story's store talks to.
 */
function StatefulReader(args: ReaderStoryArgs) {
  const dispatch = useAppDispatch();
  const preferences = useAppSelector((state) =>
    selectReaderPreferences(state.app),
  );
  const bookFile = bookFileOf(args.mediaFileId, `${args.title}.epub`);
  const mediaFiles = useListMediaFilesQuery(storyProject.id).data
    ?.media_files ?? [bookFile];
  const bilingual = useBookTranslation(
    storyProject,
    mediaFiles.find(({ id }) => id === bookFile.id) ?? bookFile,
    mediaFiles,
    args.document,
  );
  const controls = useReaderKeyBindings({ playAt: args.audio?.playAt });
  const [word, setWord] = useState<ReaderWord | null>(null);
  const [isInitialLookupOpen, setInitialLookupOpen] = useState(true);
  const close = () => {
    setWord(null);
    setInitialLookupOpen(false);
  };
  const lookup = word
    ? popupFor(word.text, close)
    : isInitialLookupOpen
      ? args.lookup
      : undefined;
  return (
    <ConnectedReaderView
      {...args}
      preferences={preferences}
      controls={controls}
      translation={bilingual.translation}
      lookup={lookup}
      lookupRect={word?.rect}
      highlightedWord={word ? { word } : undefined}
      callbacks={{
        ...args.callbacks,
        onWordClick: (clicked, input) => {
          args.callbacks.onWordClick(clicked, input);
          setWord(clicked);
        },
        onWordHover: (hovered) => {
          args.callbacks.onWordHover(hovered);
          if (word) setWord(hovered);
        },
        onDismissLookup: () => {
          args.callbacks.onDismissLookup();
          close();
        },
        onPreferencesChange: (changed) => {
          args.callbacks.onPreferencesChange(changed);
          dispatch(storingPreferences(changed));
        },
      }}
    />
  );
}

const meta = {
  title: "Reader/ReaderView",
  component: StatefulReader,
  decorators: [withAppStore],
  parameters: { layout: "fullscreen" },
  args: {
    mediaFileId: "b1",
    document: exampleNovel,
    title: "Die Verwandlung",
    projectName: "German reading",
    language: "de",
    callbacks: {
      onBack: fn(),
      onLookup: fn(),
      onWordClick: fn(),
      onWordDoubleClick: fn(),
      onWordHover: fn(),
      onWordHold: fn(),
      onDismissLookup: fn(),
      onPreferencesChange: fn(),
    },
  },
} satisfies Meta<typeof StatefulReader>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * Opens the book's screen in the story's store, which holds the reader's state, then dispatches the story's own actions.
 * Without the screen open, the reader shows its defaults and its panels do not open.
 */
const openedWith = (...storyActions: AppAction[]) => [
  withDispatchedActions(
    actions.openMediaFileRequested("p1", "b1"),
    ...storyActions,
  ),
];

/** Stores the reader's preferences, changed from the defaults as given. */
const storingPreferences = (changed: Partial<ReaderPreferences>) =>
  actions.preferenceSet(
    "readerPreferences",
    JSON.stringify({ ...defaultReaderPreferences, ...changed }),
  );

export const Pages: Story = { decorators: openedWith() };

export const Sepia: Story = {
  decorators: openedWith(storingPreferences({ theme: "sepia" })),
};

export const Dark: Story = {
  decorators: openedWith(storingPreferences({ theme: "dark" })),
};

export const Scrolling: Story = {
  decorators: openedWith(storingPreferences({ layout: "scroll" })),
};

export const LargeSansSerif: Story = {
  decorators: openedWith(
    storingPreferences({
      font: "sans",
      fontSizeStep: 6,
      isJustified: false,
      lineSpacing: "relaxed",
    }),
  ),
};

export const ResumedInPartTwo: Story = {
  decorators: openedWith(
    actions.readerJumped("b1", {
      chapterIndex: 1,
      paragraphIndex: 12,
      offset: 0,
    }),
  ),
};

export const Contents: Story = {
  decorators: openedWith(
    actions.readerJumped("b1", {
      chapterIndex: 1,
      paragraphIndex: 30,
      offset: 0,
    }),
    actions.readerPanelOpened("contents"),
  ),
};

export const Search: Story = {
  decorators: openedWith(
    actions.readerPanelOpened("search"),
    actions.readerSearchChanged("Prokurist"),
  ),
};

export const Appearance: Story = {
  decorators: openedWith(actions.readerPanelOpened("appearance")),
};

export const WordLookedUp: Story = {
  decorators: openedWith(),
  args: { lookup: popupFor("fressen", fn()) },
};

export const UnsavedWork: Story = {
  decorators: openedWith(),
  args: {
    headerContent: (
      <UnsavedWorkBanner
        hasUnsavedChanges
        isBackedUp={false}
        onSave={fn()}
        onLogIn={fn()}
      />
    ),
  },
};

export const FlashcardStarted: Story = {
  decorators: openedWith(),
  args: {
    sidePanel: (
      <FlashcardEditor
        state={{
          content: {
            word: "Ungeziefer",
            word_pronunciation: "",
            l1_definition: "",
            l2_definition: "",
            text_context:
              "Als Gregor Samsa eines Morgens aus unruhigen Träumen erwachte, fand er sich in seinem Bett zu einem ungeheueren Ungeziefer verwandelt.",
            text_context_translation: "",
            text_context_pronunciation: "",
            audio_context: null,
            screenshot: null,
            tags: ["die-verwandlung"],
          },
          includedFields: fieldsOfPreset("beginner"),
        }}
        dispatch={fn()}
        languages={exampleLanguages}
        waveform={null}
        onSave={fn()}
        onDelete={fn()}
        onClose={fn()}
        onPlayClip={fn()}
      />
    ),
  },
};

export const PlainTextFile: Story = {
  decorators: openedWith(),
  args: {
    document: unwrapHardLineBreaks(examplePlainText),
    title: "die-verwandlung.txt",
  },
};

export const ShortBook: Story = {
  decorators: openedWith(),
  args: { document: exampleShortBook, title: "Sample Book", language: "en" },
};

const audioContent = exampleAudioAlignment("a1").content;
const audioSegments =
  audioContent.kind === "audio" ? audioContent.segments : [];

/** The audio of the short book, paused in the second sentence, which is highlighted as spoken. */
const pausedAudio = {
  bar: (
    <ReaderAudioBar
      isPlaying={false}
      currentMs={1000}
      durationMs={3030}
      failure={null}
      onTogglePlay={fn()}
      onSeek={fn()}
    />
  ),
  spokenSpan: audioSegments[1]?.span ?? null,
  isPlaying: false,
  playAt: fn(),
  hasSegmentAt: () => true,
} satisfies ReaderStoryArgs["audio"];

/** The short book aligned with its audio, paused in the second sentence. */
export const AlignedWithAudio: Story = {
  decorators: openedWith(),
  args: {
    document: exampleShortBook,
    title: "Sample Book",
    language: "en",
    audio: pausedAudio,
  },
};

const translationFile: MediaFile = {
  id: "t1",
  project_id: "p1",
  name: "sample-translation.txt",
  source: { kind: "path", path: "/books/sample-translation.txt" },
  created_at_ms: 0,
  track_selection_json: null,
  origin: null,
  translation_media_file_id: null,
};

/**
 * A fake backend whose project holds the short book, paired with its Spanish translation,
 * and aligned with it sentence by sentence unless `isAligned` is false.
 */
function shortBookBackend(isAligned = true) {
  return createFakeBackendClient({
    ...fixtureResponses,
    "GET /projects/p1/media": {
      media_files: [
        { ...bookFileOf("b1", "sample.epub"), translation_media_file_id: "t1" },
        translationFile,
      ],
    },
    "GET /projects/p1/media/b1/alignments": {
      alignments: isAligned ? [exampleShortBookAlignment("b1", "t1")] : [],
    },
    "POST /documents/parse-local": exampleShortBookTranslation,
  });
}

/** The short book, read in a project that holds its Spanish translation, aligned sentence by sentence. */
const alignedShortBook = {
  parameters: { appStore: { client: shortBookBackend() } },
  args: { document: exampleShortBook, title: "Sample Book", language: "en" },
} satisfies Partial<Story>;

export const TranslationPanelOpen: Story = {
  ...alignedShortBook,
  decorators: openedWith(actions.readerPanelOpened("translation")),
};

/** The short book paired with its translation but not yet aligned, with the dialog about combining the two open. */
export const CombiningIntoBilingualEbook: Story = {
  ...alignedShortBook,
  parameters: { appStore: { client: shortBookBackend(false) } },
  decorators: openedWith(
    actions.readerPanelOpened("translation"),
    actions.readerCombineRequested(),
  ),
};

export const TranslationOnly: Story = {
  ...alignedShortBook,
  decorators: openedWith(actions.readerViewModeChosen("translation")),
};

export const Interlinear: Story = {
  ...alignedShortBook,
  decorators: openedWith(actions.readerViewModeChosen("interlinear")),
};

export const Parallel: Story = {
  ...alignedShortBook,
  decorators: openedWith(actions.readerViewModeChosen("parallel")),
};

/** The short book aligned with both its audio and its translation, in the interlinear view, paused in the second sentence. */
export const InterlinearWithAudio: Story = {
  ...alignedShortBook,
  decorators: openedWith(actions.readerViewModeChosen("interlinear")),
  args: { ...alignedShortBook.args, audio: pausedAudio },
};

/** The dictionary pop-up on a held word of the short book, with its sentence row showing the sentence's translation, and the sentence underlined. */
export const SentenceTranslationInPopup: Story = {
  ...alignedShortBook,
  decorators: openedWith(),
  args: {
    ...alignedShortBook.args,
    audio: pausedAudio,
    lookup: (
      <DictionaryPopup
        state={{ kind: "notFound", term: "dog" }}
        mode="word"
        resolveMediaUrl={resolveExampleMediaUrl}
        sentence={{
          play: { label: "Play the sentence (R)", onPlay: fn() },
          translation: {
            text: "El perro quiere comer. Tiene hambre.",
            language: "es",
            isShown: true,
            onToggle: fn(),
          },
        }}
        onSearch={fn()}
        onCreateFlashcard={fn()}
        onClose={fn()}
        onSetUpDictionary={fn()}
      />
    ),
    lookupRect: { top: 180, bottom: 204, left: 120, right: 150 },
    highlightedSentence: [
      {
        chapter_index: 0,
        paragraph_index: 1,
        start: 0,
        end: 39,
        quote: "The dog wants to eat, and it is hungry.",
      },
    ],
  },
};

const fixtureFiles = [
  { name: "die-verwandlung.epub", label: "Die Verwandlung (EPUB)" },
  { name: "die-verwandlung.txt", label: "Die Verwandlung (plain text)" },
  { name: "sample.epub", label: "Sample Book (EPUB)" },
];

type OpenFile = { name: string; document: Document };

/** Keeps the store's preferences, the reading place among them, in the browser's storage, which may be unavailable, as in a private window. */
const browserPreferenceStorage = {
  loadPreference: async (key: string) => {
    try {
      return localStorage.getItem(`storybook:${key}`);
    } catch {
      return null;
    }
  },
  savePreference: async (key: string, value: string) => {
    try {
      localStorage.setItem(`storybook:${key}`, value);
    } catch {
      // The reader works the same without storage; it only forgets the place and the appearance.
    }
  },
};

/**
 * Opens a fixture or a file of your own with the app's Rust parser, built to WebAssembly.
 * The reading position and the appearance are kept in the browser's storage, so that reopening a file returns to the same place.
 */
function FileReader(args: ReaderStoryArgs) {
  const dispatch = useAppDispatch();
  const [file, setFile] = useState<OpenFile | null>(null);
  const isPlaceLoaded = useAppSelector(
    selectIsReadingLocationLoaded(file?.name ?? ""),
  );
  const preferencesLoaded = useAppSelector(selectPreferencesLoaded);
  const [error, setError] = useState<string | null>(null);
  const [language, setLanguage] = useState("de");
  const open = async (name: string, bytes: Promise<ArrayBuffer>) => {
    try {
      setError(null);
      const document = await parseDocumentWithWasm(new Uint8Array(await bytes));
      dispatch(actions.openMediaFileRequested("p1", name));
      setFile({ name, document: unwrapHardLineBreaks(document) });
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause));
    }
  };
  if (file && (!isPlaceLoaded || !preferencesLoaded)) return null;
  if (file)
    return (
      <StatefulReader
        {...args}
        mediaFileId={file.name}
        document={file.document}
        title={file.document.title || file.name}
        language={file.document.language ?? language}
        callbacks={{
          ...args.callbacks,
          onBack: () => {
            dispatch(actions.closeMedia());
            setFile(null);
          },
        }}
      />
    );
  return (
    <main
      className="mx-auto flex min-h-dvh max-w-md flex-col justify-center gap-4 p-6 text-fg"
      onDragOver={(event) => event.preventDefault()}
      onDrop={(event) => {
        event.preventDefault();
        const dropped = event.dataTransfer.files[0];
        if (dropped) open(dropped.name, dropped.arrayBuffer());
      }}
    >
      <h1 className="text-xl font-semibold">Open a book</h1>
      {!isWasmBuilt && (
        <p className="rounded-md bg-warning-soft p-3 text-sm text-warning-fg">
          Build the parser first with <code>mise run wasm:build</code>, then
          reload Storybook.
        </p>
      )}
      <div className="flex flex-col gap-2">
        {fixtureFiles.map((fixture) => (
          <button
            key={fixture.name}
            type="button"
            className="rounded-md border border-line-strong bg-surface px-3 py-2 text-left hover:bg-surface-muted"
            onClick={() =>
              open(
                fixture.name,
                fetch(`fixtures/${fixture.name}`).then((response) =>
                  response.arrayBuffer(),
                ),
              )
            }
          >
            {fixture.label}
          </button>
        ))}
      </div>
      <label className="flex flex-col gap-1 text-sm">
        Or choose or drop an EPUB or text file of your own
        <input
          type="file"
          accept=".epub,.txt,application/epub+zip,text/plain"
          onChange={(event) => {
            const chosen = event.target.files?.[0];
            if (chosen) open(chosen.name, chosen.arrayBuffer());
          }}
        />
      </label>
      <label className="flex items-center gap-2 text-sm">
        Language of text files
        <select
          value={language}
          onChange={(event) => setLanguage(event.target.value)}
          className="rounded-md border border-line-strong bg-surface px-2 py-1"
        >
          {languageOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </label>
      {error && <p className="text-sm text-danger-fg">{error}</p>}
    </main>
  );
}

export const OpenAFile: Story = {
  parameters: { appStore: { preferenceStorage: browserPreferenceStorage } },
  render: (args) => <FileReader {...args} />,
};
