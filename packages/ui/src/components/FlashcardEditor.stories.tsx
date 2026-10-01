import { actions } from "@easyimmerse/state";
import type { NewFlashcard } from "@easyimmerse/types";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { type ComponentProps, useEffect } from "react";
import { fn } from "storybook/test";
import { useAppDispatch } from "../hooks/useAppDispatch.ts";
import { withAppStore } from "../storybook/withAppStore.tsx";
import { createNewFlashcard } from "../testSupport/createNewFlashcard.ts";
import { FlashcardEditor } from "./FlashcardEditor.tsx";

const clip = { start_ms: 500, end_ms: 1500 };

const beginnerCard = createNewFlashcard({
  fields: [
    { kind: "word", value: "Katze" },
    { kind: "word_pronunciation", value: "ˈkat͡sə" },
    { kind: "l1_definition", value: "cat\nfemale cat, as opposed to a tomcat" },
    { kind: "context", value: "Die Katze schläft auf dem Sofa." },
    { kind: "context_translation", value: "The cat is sleeping on the sofa." },
    { kind: "context_pronunciation", value: "" },
    { kind: "context_audio", value: "" },
    { kind: "screenshot", value: "" },
  ],
  tags: ["dark-s01e01"],
  clip,
  screenshot_ms: 1000,
});

const savedCard = createNewFlashcard({
  fields: [
    { kind: "word", value: "Hund" },
    { kind: "l1_definition", value: "dog" },
    { kind: "context", value: "Der Hund will fressen." },
    { kind: "context_translation", value: "The dog wants to eat." },
    { kind: "context_audio", value: "" },
  ],
  tags: ["dark-s01e01", "noun"],
  clip: { start_ms: 1750, end_ms: 3000 },
});

const screenshotSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="320" height="180"><rect width="320" height="180" fill="#1e3a5f"/><circle cx="250" cy="50" r="22" fill="#f5e6a8"/><rect y="130" width="320" height="50" fill="#2d4a3e"/></svg>`;

const screenshotCard = createNewFlashcard({
  fields: [
    { kind: "word", value: "Katze" },
    { kind: "context", value: "Die Katze schläft auf dem Sofa." },
    {
      kind: "screenshot",
      value: `data:image/svg+xml,${encodeURIComponent(screenshotSvg)}`,
    },
  ],
  clip,
  screenshot_ms: 1000,
});

/** Opens the editor on the card on mount. */
function OpenedFlashcardEditor({
  card,
  flashcardId,
  ...props
}: ComponentProps<typeof FlashcardEditor> & {
  card: NewFlashcard;
  flashcardId: string | null;
}) {
  const dispatch = useAppDispatch();
  useEffect(() => {
    dispatch(actions.flashcardEditorOpened("p1", card, flashcardId));
  }, [dispatch, card, flashcardId]);
  return <FlashcardEditor {...props} />;
}

const meta = {
  title: "Components/FlashcardEditor",
  component: OpenedFlashcardEditor,
  decorators: [withAppStore],
  parameters: { layout: "fullscreen" },
  args: {
    card: beginnerCard,
    flashcardId: null,
    onSave: fn(),
    onDelete: fn(),
  },
} satisfies Meta<typeof OpenedFlashcardEditor>;

export default meta;
type Story = StoryObj<typeof meta>;

export const NewCardBeginner: Story = {};

export const EditingSavedCard: Story = {
  args: { card: savedCard, flashcardId: "f1" },
};

export const WithScreenshot: Story = { args: { card: screenshotCard } };

export const MinimalFields: Story = { args: { card: createNewFlashcard() } };
