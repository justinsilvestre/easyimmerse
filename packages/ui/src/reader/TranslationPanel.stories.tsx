import type { MediaFile } from "@easyimmerse/types";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { fn } from "storybook/test";
import { TranslationPanel } from "./TranslationPanel.tsx";

function document(id: string, name: string): MediaFile {
  return {
    id,
    project_id: "p1",
    name,
    source: { kind: "path", path: `/books/${name}` },
    created_at_ms: 0,
    track_selection_json: null,
    origin: null,
    translation_media_file_id: null,
  };
}

const spanish = document("t1", "die-verwandlung-es.epub");
const english = document("t2", "metamorphosis.txt");

const meta = {
  title: "Reader/TranslationPanel",
  component: TranslationPanel,
  parameters: { layout: "fullscreen" },
  args: {
    candidates: [spanish, english],
    paired: null,
    isAligned: false,
    viewMode: "target",
    viewModes: ["target"],
    onChoose: fn(),
    onViewModeChange: fn(),
    onCombine: fn(),
    onClose: fn(),
  },
} satisfies Meta<typeof TranslationPanel>;

export default meta;
type Story = StoryObj<typeof meta>;

export const ChoosingATranslation: Story = {};

export const NoOtherDocument: Story = {
  args: { candidates: [] },
};

export const Paired: Story = {
  args: {
    paired: spanish,
    viewMode: "translation",
    viewModes: ["target", "translation"],
  },
};

export const Aligned: Story = {
  args: {
    paired: spanish,
    isAligned: true,
    viewMode: "interlinear",
    viewModes: ["target", "translation", "interlinear", "parallel"],
  },
};
