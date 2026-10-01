import type { Meta, StoryObj } from "@storybook/react-vite";
import { flashcardPresetFields } from "../flashcardPresetFields.ts";
import { FlashcardPreview } from "./FlashcardPreview.tsx";

const meta = {
  title: "Components/FlashcardPreview",
  component: FlashcardPreview,
  args: {
    targetLanguage: "en",
    translationLanguage: "de",
    settings: {
      included_fields: [...flashcardPresetFields.intermediate],
      default_tags: [],
      tag_with_media_name: true,
      use_tts_when_no_audio: false,
    },
  },
  decorators: [
    (Story) => (
      <div className="w-80">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof FlashcardPreview>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Intermediate: Story = {};

export const BeginnerWithTags: Story = {
  args: {
    settings: {
      included_fields: [...flashcardPresetFields.beginner],
      default_tags: ["english", "sitcom"],
      tag_with_media_name: true,
      use_tts_when_no_audio: true,
    },
  },
};

export const AdvancedWithoutTags: Story = {
  args: {
    settings: {
      included_fields: [...flashcardPresetFields.advanced],
      default_tags: [],
      tag_with_media_name: false,
      use_tts_when_no_audio: false,
    },
  },
};

export const NoFields: Story = {
  args: {
    settings: {
      included_fields: [],
      default_tags: [],
      tag_with_media_name: true,
      use_tts_when_no_audio: false,
    },
  },
};
