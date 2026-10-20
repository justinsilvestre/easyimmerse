import { actions } from "@easyimmerse/state";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { withAppStore } from "../../storybook/withAppStore.tsx";
import { withDispatchedActions } from "../../storybook/withDispatchedActions.tsx";
import {
  createFakeBackendClient,
  fakeFailure,
} from "../../testSupport/createFakeBackendClient.ts";
import { fixtureResponses } from "../../testSupport/fixtureResponses.ts";
import { exampleFlashcard } from "../exampleFlashcard.ts";

/** A backend that saves no flashcard, as one that runs offline cannot. */
const offlineSaves = createFakeBackendClient({
  ...fixtureResponses,
  "POST /projects/p1/flashcards": fakeFailure({
    status: "OFFLINE",
    message:
      "POST /projects/p1/flashcards needs a server, and none is configured.",
  }),
});

const savedWord = actions.flashcardStarted(
  {
    id: "story-fressen",
    draft: {
      media_file_id: "m1",
      cue_index: 1,
      word_start: null,
      content: { ...exampleFlashcard, word: "fressen" },
      included_fields: ["word"],
    },
  },
  "save",
);

/** The screen beneath the app's notice region, where the status lines show. */
function ScreenBeneath() {
  return <p className="p-4 text-fg-muted">The screen beneath.</p>;
}

const meta = {
  title: "Flashcards/NotBackedUpStatus",
  component: ScreenBeneath,
  decorators: [
    withDispatchedActions(
      actions.openMediaFileRequested("p1", "m1"),
      savedWord,
    ),
    withAppStore,
  ],
  parameters: { appStore: { client: offlineSaves } },
} satisfies Meta<typeof ScreenBeneath>;

export default meta;
type Story = StoryObj<typeof meta>;

export const NotBackedUp: Story = {};
