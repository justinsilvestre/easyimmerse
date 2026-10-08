import type { Meta, StoryObj } from "@storybook/react-vite";
import { fn } from "storybook/test";
import {
  exampleAmbiguousInflectionResult,
  exampleFormOfResult,
  exampleInflectedResult,
  examplePronunciationResult,
} from "./exampleJapaneseLookup.ts";
import { exampleResults } from "./exampleLookup.ts";
import {
  exampleMDictResult,
  examplePangoResult,
  exampleStarDictHtmlResult,
  exampleXdxfResult,
} from "./exampleMarkupLookup.ts";
import { resolveExampleMediaUrl } from "./exampleMedia.ts";
import { LookupResultCard } from "./LookupResultCard.tsx";

const meta = {
  title: "Lookup/LookupResultCard",
  component: LookupResultCard,
  decorators: [
    (Story) => (
      <div className="w-[32rem] rounded-lg border border-line bg-surface p-3 text-fg">
        <Story />
      </div>
    ),
  ],
  args: {
    result: exampleInflectedResult,
    resolveMediaUrl: resolveExampleMediaUrl,
    onWordLookup: fn(),
    onLookup: fn(),
    onCreateFlashcard: fn(),
  },
} satisfies Meta<typeof LookupResultCard>;

export default meta;
type Story = StoryObj<typeof meta>;

export const YomitanStructuredContent: Story = {};

export const SeveralInflectionChains: Story = {
  args: { result: exampleAmbiguousInflectionResult },
};

export const InflectedFormOf: Story = {
  args: { result: exampleFormOfResult },
};

export const FrequenciesAndPitchAccents: Story = {
  args: { result: examplePronunciationResult },
};

export const PlainText: Story = {
  args: { result: exampleResults[0] },
};

export const StarDictHtml: Story = {
  args: { result: exampleStarDictHtmlResult },
};

export const StarDictPango: Story = {
  args: { result: examplePangoResult },
};

export const StarDictXdxf: Story = {
  args: { result: exampleXdxfResult },
};

export const MDictHtml: Story = {
  args: { result: exampleMDictResult },
};
