import {
  type AppAction,
  actions,
  type ReaderLocation,
  selectReadingLocation,
} from "@easyimmerse/state";
import type { Document, LookupResult } from "@easyimmerse/types";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { type ComponentProps, useEffect, useState } from "react";
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
import { ConnectedReaderView } from "./ConnectedReaderView.tsx";
import {
  exampleNovel,
  examplePlainText,
  exampleShortBook,
} from "./exampleDocuments.ts";
import {
  defaultReaderPreferences,
  type ReaderPreferences,
} from "./readerPreferences.ts";
import { unwrapHardLineBreaks } from "./unwrapHardLineBreaks.ts";
import type { ReaderWord } from "./useWordPointer.ts";

type ReaderViewProps = ComponentProps<typeof ConnectedReaderView>;

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
 * Keeps the preferences and the looked-up word in state, so that the appearance controls and the dictionary pop-up work in every story.
 * A click opens the pop-up on a word, and resting the mouse on another moves it there.
 * "Ungeziefer" and "fressen" have entries.
 */
function StatefulReader(args: ReaderViewProps) {
  const [preferences, setPreferences] = useState(args.preferences);
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
          setPreferences(changed);
        },
      }}
    />
  );
}

const meta = {
  title: "Reader/ReaderView",
  component: ConnectedReaderView,
  decorators: [withAppStore],
  parameters: { layout: "fullscreen" },
  args: {
    mediaFileId: "b1",
    document: exampleNovel,
    title: "Die Verwandlung",
    projectName: "German reading",
    language: "de",
    preferences: defaultReaderPreferences,
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
  render: (args) => <StatefulReader {...args} />,
} satisfies Meta<typeof ConnectedReaderView>;

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

export const Pages: Story = { decorators: openedWith() };

export const Sepia: Story = {
  decorators: openedWith(),
  args: { preferences: { ...defaultReaderPreferences, theme: "sepia" } },
};

export const Dark: Story = {
  decorators: openedWith(),
  args: { preferences: { ...defaultReaderPreferences, theme: "dark" } },
};

export const Scrolling: Story = {
  decorators: openedWith(),
  args: { preferences: { ...defaultReaderPreferences, layout: "scroll" } },
};

export const LargeSansSerif: Story = {
  decorators: openedWith(),
  args: {
    preferences: {
      ...defaultReaderPreferences,
      font: "sans",
      fontSizeStep: 6,
      isJustified: false,
      lineSpacing: "relaxed",
    },
  },
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

const fixtureFiles = [
  { name: "die-verwandlung.epub", label: "Die Verwandlung (EPUB)" },
  { name: "die-verwandlung.txt", label: "Die Verwandlung (plain text)" },
  { name: "sample.epub", label: "Sample Book (EPUB)" },
];

type OpenFile = { name: string; document: Document };

/** Reads the browser's storage, which may be unavailable, as in a private window. */
function readStored<Value>(key: string): Value | undefined {
  try {
    const stored = localStorage.getItem(key);
    return stored === null ? undefined : JSON.parse(stored);
  } catch {
    return undefined;
  }
}

function writeStored(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // The reader works the same without storage; it only forgets the place.
  }
}

/** Keeps the reading place of an open file in the browser's storage, so that reopening the file after a reload returns to it. */
function RememberedPlace({ name }: { name: string }) {
  const location = useAppSelector(selectReadingLocation(name));
  useEffect(() => {
    if (location) writeStored(`reader-location:${name}`, location);
  }, [name, location]);
  return null;
}

/**
 * Opens a fixture or a file of your own with the app's Rust parser, built to WebAssembly.
 * The reading position and the appearance are kept in the browser's storage, so that reopening a file returns to the same place.
 */
function FileReader(args: ReaderViewProps) {
  const dispatch = useAppDispatch();
  const [file, setFile] = useState<OpenFile | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [language, setLanguage] = useState("de");
  const open = async (name: string, bytes: Promise<ArrayBuffer>) => {
    try {
      setError(null);
      const document = await parseDocumentWithWasm(new Uint8Array(await bytes));
      dispatch(actions.openMediaFileRequested("p1", name));
      dispatch(
        actions.readingLocationLoaded(
          name,
          readStored<ReaderLocation>(`reader-location:${name}`) ?? null,
        ),
      );
      setFile({ name, document: unwrapHardLineBreaks(document) });
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause));
    }
  };
  if (file)
    return (
      <>
        <RememberedPlace name={file.name} />
        <StatefulReader
          {...args}
          mediaFileId={file.name}
          document={file.document}
          title={file.document.title || file.name}
          language={file.document.language ?? language}
          preferences={
            readStored<ReaderPreferences>("reader-preferences") ??
            args.preferences
          }
          callbacks={{
            ...args.callbacks,
            onBack: () => setFile(null),
            onPreferencesChange: (preferences) =>
              writeStored("reader-preferences", preferences),
          }}
        />
      </>
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
  render: (args) => <FileReader {...args} />,
};
