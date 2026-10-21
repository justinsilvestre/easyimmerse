import { actions } from "@easyimmerse/state";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { userEvent, within } from "storybook/test";
import { AppFooter } from "../components/AppFooter.tsx";
import { exampleFlashcard } from "../flashcards/exampleFlashcard.ts";
import { withAppStore } from "../storybook/withAppStore.tsx";
import { withDispatchedActions } from "../storybook/withDispatchedActions.tsx";
import {
  createFakeBackendClient,
  fakeFailure,
} from "../testSupport/createFakeBackendClient.ts";
import { fixtureResponses } from "../testSupport/fixtureResponses.ts";

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

/** A screen with the app's footer at its bottom, where the sign shows. */
function ScreenWithFooter() {
  return (
    <div className="flex h-screen flex-col">
      <p className="flex-1 p-4 text-fg-muted">The screen above.</p>
      <AppFooter />
    </div>
  );
}

const meta = {
  title: "Account/NotBackedUpSign",
  component: ScreenWithFooter,
  decorators: [
    withDispatchedActions(
      actions.openMediaFileRequested("p1", "m1"),
      savedWord,
    ),
    withAppStore,
  ],
  parameters: { layout: "fullscreen", appStore: { client: offlineSaves } },
} satisfies Meta<typeof ScreenWithFooter>;

export default meta;
type Story = StoryObj<typeof meta>;

export const NotBackedUp: Story = {};

/** The sign pressed, showing where the flashcards are kept and the way to log in. */
export const Explained: Story = {
  play: async ({ canvasElement }) => {
    await userEvent.click(
      await within(canvasElement).findByRole("button", {
        name: "Not backed up",
      }),
    );
  },
};
