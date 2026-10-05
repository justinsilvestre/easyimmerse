import type { Meta, StoryObj } from "@storybook/react-vite";
import type { ComponentProps } from "react";
import { useReducer } from "react";
import { fn } from "storybook/test";
import { generateExamplePeaks } from "../media/examplePeaks.ts";
import { type EditorAction, reduceEditor } from "./editFlashcard.ts";
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
