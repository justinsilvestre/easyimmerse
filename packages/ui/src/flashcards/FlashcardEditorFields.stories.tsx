import { type EditorAction, reduceEditor } from "@easyimmerse/state";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { type ComponentProps, useReducer } from "react";
import { fn } from "storybook/test";
import { generateExamplePeaks } from "../media/examplePeaks.ts";
import { exampleFlashcard, exampleScreenshotUrl } from "./exampleFlashcard.ts";
import { MediaFields } from "./FlashcardEditorFields.tsx";
import { fieldsOfPreset } from "./flashcardPresets.ts";

/** Holds the editor's state as the flashcard editor does, so that moving the clip takes effect. */
function MediaFieldsWithState(props: ComponentProps<typeof MediaFields>) {
  const [state, dispatch] = useReducer(reduceEditor, props.state);
  const dispatchAndRecord = (action: EditorAction) => {
    props.dispatch(action);
    dispatch(action);
  };
  return <MediaFields {...props} state={state} dispatch={dispatchAndRecord} />;
}

const meta = {
  title: "Flashcards/MediaFields",
  component: MediaFields,
  render: (args) => <MediaFieldsWithState {...args} />,
  decorators: [
    (Story) => (
      <div className="w-full max-w-80">
        <Story />
      </div>
    ),
  ],
  args: {
    state: {
      content: exampleFlashcard,
      includedFields: [...fieldsOfPreset("intermediate"), "screenshot"],
    },
    dispatch: fn(),
    screenshotUrl: exampleScreenshotUrl,
    waveform: { peaks: generateExamplePeaks(240), durationMs: 24_000 },
    mediaDurationMs: 24_000,
    onPlayClip: fn(),
  },
} satisfies Meta<typeof MediaFields>;

export default meta;
type Story = StoryObj<typeof meta>;

export const WithWaveform: Story = {};

/** A file the browser holds, whose waveform cannot be loaded, so the clip shows as its times. */
export const WithoutWaveform: Story = { args: { waveform: null } };

/** Save was pressed, so the clip and the screenshot can no longer be changed. */
export const WhileSaving: Story = {
  args: { waveform: null, isReadOnly: true },
};
