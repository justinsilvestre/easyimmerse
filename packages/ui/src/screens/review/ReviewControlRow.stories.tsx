import type { Meta, StoryObj } from "@storybook/react-vite";
import { fn, userEvent, within } from "storybook/test";
import { ReviewControlRow } from "./ReviewControlRow.tsx";

const meta = {
  title: "Screens/Review/ReviewControlRow",
  component: ReviewControlRow,
  decorators: [
    (Story) => (
      <div className="w-[min(48rem,calc(100vw-2rem))] bg-canvas">
        <Story />
      </div>
    ),
  ],
  args: {
    projectName: "German series",
    progress: {
      finished: 4,
      total: 16,
      newCount: 3,
      learningCount: 1,
      dueCount: 8,
    },
    canUndo: false,
    hasCard: true,
    onBack: fn(),
    onUndo: fn(),
    onEditFlashcard: fn(),
    onBury: fn(),
    onSuspend: fn(),
    onDeleteFlashcard: fn(),
    areIntervalsShown: false,
    onToggleIntervals: fn(),
  },
} satisfies Meta<typeof ReviewControlRow>;

export default meta;
type Story = StoryObj<typeof meta>;

/** At the start of a session, before any rating, Undo is unavailable. */
export const BeforeARating: Story = {};

export const UndoAvailable: Story = {
  args: { canUndo: true },
};

/** Once the session has ended, no card is left for the More menu to act on. */
export const SessionEnded: Story = {
  args: {
    canUndo: true,
    hasCard: false,
    progress: {
      finished: 16,
      total: 16,
      newCount: 0,
      learningCount: 0,
      dueCount: 0,
    },
  },
};

/** The More menu open, with the cards left by kind above the card's actions. */
export const MoreMenuOpen: Story = {
  play: async ({ canvasElement }) => {
    await userEvent.click(
      within(canvasElement).getByRole("button", { name: "More" }),
    );
  },
};

/** The More menu open on a card made from the library, which opens read-only. */
export const LibraryCardMenuOpen: Story = {
  args: { isFromLibrary: true },
  play: MoreMenuOpen.play,
};
