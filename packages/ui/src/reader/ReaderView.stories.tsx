import type { Document, LookupResult } from "@easyimmerse/types";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { type ComponentProps, useState } from "react";
import { fn } from "storybook/test";
import { exampleLanguages } from "../flashcards/exampleFlashcard.ts";
import { FlashcardEditor } from "../flashcards/FlashcardEditor.tsx";
import { fieldsOfPreset } from "../flashcards/flashcardPresets.ts";
import { UnsavedWorkBanner } from "../flashcards/UnsavedWorkBanner.tsx";
import { DictionaryPopup } from "../lookup/DictionaryPopup.tsx";
import { exampleResults } from "../lookup/exampleLookup.ts";
import { resolveExampleMediaUrl } from "../lookup/exampleMedia.ts";
import { exampleTermEntry } from "../lookup/exampleTermEntry.ts";
import type { LookupState } from "../lookup/lookupState.ts";
import { languageOptions } from "../projects/languages.ts";
import {
  isWasmBuilt,
  parseDocumentWithWasm,
} from "../storybook/parseDocumentWithWasm.ts";
import {
  exampleNovel,
  examplePlainText,
  exampleShortBook,
} from "./exampleDocuments.ts";
import { ReaderView } from "./ReaderView.tsx";
import {
  defaultReaderPreferences,
  type ReaderPreferences,
} from "./readerPreferences.ts";
import type { ReaderWord } from "./useWordPointer.ts";

type ReaderViewProps = ComponentProps<typeof ReaderView>;

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

function lookupStateOf(word: string): LookupState {
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
    <ReaderView
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
        onWordHoverAnswered: (hovered) => {
          args.callbacks.onWordHoverAnswered?.(hovered);
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
  component: ReaderView,
  parameters: { layout: "fullscreen" },
  args: {
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
      onWordHoverAnswered: fn(),
      onWordHold: fn(),
      onDismissLookup: fn(),
      onLocationChange: fn(),
      onPreferencesChange: fn(),
    },
  },
  render: (args) => <StatefulReader {...args} />,
} satisfies Meta<typeof ReaderView>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Pages: Story = {};

export const Sepia: Story = {
  args: { preferences: { ...defaultReaderPreferences, theme: "sepia" } },
};

export const Dark: Story = {
  args: { preferences: { ...defaultReaderPreferences, theme: "dark" } },
};

export const Scrolling: Story = {
  args: { preferences: { ...defaultReaderPreferences, layout: "scroll" } },
};

export const LargeSansSerif: Story = {
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
  args: {
    initialLocation: { chapterIndex: 1, paragraphIndex: 12, offset: 0 },
  },
};

export const Contents: Story = {
  args: {
    initialLocation: { chapterIndex: 1, paragraphIndex: 30, offset: 0 },
    initialPanel: "contents",
  },
};

export const Search: Story = {
  args: { initialPanel: "search", initialSearchQuery: "Prokurist" },
};

export const Appearance: Story = {
  args: { initialPanel: "appearance" },
};

export const WordLookedUp: Story = {
  args: { lookup: popupFor("fressen", fn()) },
};

export const UnsavedWork: Story = {
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
  args: { document: examplePlainText, title: "die-verwandlung.txt" },
};

export const ShortBook: Story = {
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

/**
 * Opens a fixture or a file of your own with the app's Rust parser, built to WebAssembly.
 * The reading position and the appearance are kept in the browser's storage, so that reopening a file returns to the same place.
 */
function FileReader(args: ReaderViewProps) {
  const [file, setFile] = useState<OpenFile | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [language, setLanguage] = useState("de");
  const open = async (name: string, bytes: Promise<ArrayBuffer>) => {
    try {
      setError(null);
      const document = await parseDocumentWithWasm(new Uint8Array(await bytes));
      setFile({ name, document });
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause));
    }
  };
  if (file)
    return (
      <StatefulReader
        {...args}
        document={file.document}
        title={file.document.title || file.name}
        language={file.document.language ?? language}
        preferences={
          readStored<ReaderPreferences>("reader-preferences") ??
          args.preferences
        }
        initialLocation={readStored(`reader-location:${file.name}`)}
        callbacks={{
          ...args.callbacks,
          onBack: () => setFile(null),
          onLocationChange: (location) =>
            writeStored(`reader-location:${file.name}`, location),
          onPreferencesChange: (preferences) =>
            writeStored("reader-preferences", preferences),
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
  render: (args) => <FileReader {...args} />,
};
