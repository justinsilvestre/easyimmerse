import { type EditorAction, reduceEditor } from "@easyimmerse/state";
import type { Meta, StoryObj } from "@storybook/react-vite";
import type { ComponentProps } from "react";
import { useReducer } from "react";
import { fn } from "storybook/test";
import { generateExamplePeaks } from "../media/examplePeaks.ts";
import {
  exampleFlashcard,
  exampleLanguages,
  exampleScreenshotUrl,
} from "./exampleFlashcard.ts";
import { FlashcardEditor } from "./FlashcardEditor.tsx";
import { fieldsOfPreset } from "./flashcardPresets.ts";

/** Holds the editor's state as the media screen does, starting from the story's state, so that edits take effect. */
function EditorWithState(props: ComponentProps<typeof FlashcardEditor>) {
  const [state, dispatch] = useReducer(reduceEditor, props.state);
  const dispatchAndRecord = (action: EditorAction) => {
    props.dispatch(action);
    dispatch(action);
  };
  return (
    <FlashcardEditor {...props} state={state} dispatch={dispatchAndRecord} />
  );
}

const meta = {
  title: "Flashcards/FlashcardEditor",
  component: FlashcardEditor,
  render: (args) => <EditorWithState {...args} />,
  decorators: [
    (Story) => (
      <div className="h-[36rem] w-full max-w-96">
        <Story />
      </div>
    ),
  ],
  args: {
    state: {
      content: exampleFlashcard,
      includedFields: fieldsOfPreset("intermediate"),
    },
    dispatch: fn(),
    languages: exampleLanguages,
    screenshotUrl: exampleScreenshotUrl,
    waveform: { peaks: generateExamplePeaks(240), durationMs: 24_000 },
    onSave: fn(),
    onDelete: fn(),
    onClose: fn(),
    onPlayClip: fn(),
  },
} satisfies Meta<typeof FlashcardEditor>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Intermediate: Story = {};

export const Beginner: Story = {
  args: {
    state: {
      content: exampleFlashcard,
      includedFields: fieldsOfPreset("beginner"),
    },
  },
};

export const FromAnEbook: Story = {
  args: {
    state: {
      content: {
        ...exampleFlashcard,
        audio_context: null,
        screenshot: null,
        tags: ["die-verwandlung"],
      },
      includedFields: fieldsOfPreset("intermediate"),
    },
    waveform: null,
  },
};

/** Save was pressed while the word's definitions are still on their way. */
export const SaveWaitingForDefinitions: Story = {
  args: { saveStatus: "waitingForDefinitions" },
};

/** A flashcard just started, which has never been saved and so has nothing to delete. */
export const NewFlashcard: Story = {
  args: { isNew: true },
};

/** The last save failed; the line stays until Save is pressed again. */
export const SaveFailed: Story = {
  args: { hasSaveFailed: true },
};

/** A definition too long for its field, cut off with a faded edge until the field has focus. */
export const LongDefinition: Story = {
  args: {
    state: {
      content: {
        ...exampleFlashcard,
        l1_definition:
          "1. (of an animal) to eat; to feed on. 2. (colloquial, derogatory, of a person) to eat greedily or in large amounts; to gobble, to wolf down. 3. (figurative) to use up or consume in large quantities, as a machine that eats electricity or a project that swallows all of one's savings. 4. (figurative) to take in eagerly, as a reader who devours books. 5. (idiom) jemanden gefressen haben: to be unable to stand someone. 6. (idiom) etwas gefressen haben: to have finally understood something. 7. (idiom) wie ein Scheunendrescher fressen: to eat like a horse.",
      },
      includedFields: fieldsOfPreset("intermediate"),
    },
  },
};
