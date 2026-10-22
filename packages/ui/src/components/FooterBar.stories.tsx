import type { Decorator, Meta, StoryObj } from "@storybook/react-vite";
import { fn, userEvent, within } from "storybook/test";
import { PanelToggles } from "../media/PanelToggles.tsx";
import { sampleFooterActivities as samples } from "../storybook/sampleFooterActivities.ts";
import { withAppStore } from "../storybook/withAppStore.tsx";
import { FooterBar } from "./FooterBar.tsx";

/** A window of the given width with the footer at its bottom, so that a menu has room to open upward. */
const inWindow =
  (widthClass = "w-full"): Decorator =>
  (Story) => (
    <div className={`flex h-64 ${widthClass} flex-col bg-canvas text-fg`}>
      <div className="flex-1" />
      <Story />
    </div>
  );

const mediaToggles = (
  <PanelToggles
    panels={{ cues: true, waveform: false, isFullscreen: false }}
    callbacks={{
      onToggleCuePanel: fn(),
      onToggleWaveform: fn(),
      onToggleFullscreen: fn(),
    }}
  />
);

const meta = {
  title: "Components/FooterActivities/FooterBar",
  component: FooterBar,
  decorators: [inWindow(), withAppStore],
  parameters: { layout: "fullscreen" },
  args: {
    isSettingsOpen: false,
    onOpenSettings: fn(),
    activities: [samples.dictionaryImport],
    onOpenActivity: fn(),
  },
} satisfies Meta<typeof FooterBar>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Idle: Story = { args: { activities: [] } };

/** In Settings, whose button stands for the page already open. */
export const InSettings: Story = {
  args: { activities: [], isSettingsOpen: true },
};

export const OneActivity: Story = {};

/** Two activities side by side, as the footer has room for on a desktop window. */
export const TwoActivities: Story = {
  args: { activities: [samples.dictionaryImport, samples.mediaFetch] },
};

/** Three or more activities fold into one summary button whatever the width. */
export const SeveralCollapsed: Story = {
  args: {
    activities: [
      samples.dictionaryImport,
      samples.mediaFetch,
      samples.flashcardExport,
    ],
  },
};

export const FailureAmongRunning: Story = {
  args: {
    activities: [
      samples.bookAlignment,
      samples.mediaFetchFailed,
      samples.subtitleGeneration,
    ],
  },
};

export const OneFailure: Story = {
  args: { activities: [samples.dictionaryImportFailed] },
};

/** Flashcard saves that have waited on the server for more than a couple of seconds. */
export const PendingFlashcardSaves: Story = {
  args: { activities: [samples.pendingFlashcardSaves] },
};

/** The media screen's footer on a phone 375 px wide, where two activities fold beside the panel toggles. */
export const OnAPhoneWithMediaToggles: Story = {
  decorators: [inWindow("w-[375px]")],
  args: {
    activities: [samples.dictionaryImport, samples.mediaFetch],
    children: mediaToggles,
  },
};

/** One activity on the same phone, cut short beside the toggles. */
export const OnAPhoneWithOneActivity: Story = {
  decorators: [inWindow("w-[375px]")],
  args: {
    activities: [samples.bookAlignment],
    children: mediaToggles,
  },
};

/** The media screen's footer on a desktop window, with the activities and the toggles sharing the bar. */
export const WithMediaToggles: Story = {
  args: {
    activities: [samples.dictionaryImport, samples.mediaFetch],
    children: mediaToggles,
  },
};

/** The summary button's menu, open above the footer. */
export const MenuOpen: Story = {
  args: {
    activities: [
      samples.dictionaryImport,
      samples.mediaFetchFailed,
      samples.bookAlignment,
    ],
  },
  play: async ({ canvasElement }) => {
    await userEvent.click(
      within(canvasElement).getByRole("button", { name: /running/ }),
    );
  },
};
