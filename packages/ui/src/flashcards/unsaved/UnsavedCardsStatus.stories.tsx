import type { Meta, StoryObj } from "@storybook/react-vite";
import { useEffect } from "react";
import { withAppStore } from "../../storybook/withAppStore.tsx";
import { useUnsavedCards } from "../SharedSavingContext.tsx";
import { exampleUnsavedCard } from "./exampleUnsavedCard.ts";
import type { UnsavedCard } from "./unsavedCard.ts";

/** Lists the given cards as not saved; the app's notice region then shows the status line. */
function ListedCards({ cards }: { cards: UnsavedCard[] }) {
  const store = useUnsavedCards();
  useEffect(() => {
    for (const card of cards) store.put(card);
    return () => {
      for (const card of cards) store.remove(card.flashcardId);
    };
  }, [store, cards]);
  return <p className="p-4 text-fg-muted">The screen beneath.</p>;
}

const meta = {
  title: "Flashcards/UnsavedCardsStatus",
  component: ListedCards,
  decorators: [withAppStore],
  args: {
    cards: [exampleUnsavedCard("fressen"), exampleUnsavedCard("schlafen")],
  },
} satisfies Meta<typeof ListedCards>;

export default meta;
type Story = StoryObj<typeof meta>;

export const SeveralNotSaved: Story = {};

export const OneRefusedByTheServer: Story = {
  args: { cards: [exampleUnsavedCard("fressen", { isRejected: true })] },
};
