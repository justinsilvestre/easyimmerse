import { actions } from "@easyimmerse/state";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { useEffect } from "react";
import { useAppDispatch } from "../../hooks/useAppDispatch.ts";
import { withAppStore } from "../../storybook/withAppStore.tsx";
import {
  createFakeBackendClient,
  fakeFailure,
} from "../../testSupport/createFakeBackendClient.ts";
import { fixtureResponses } from "../../testSupport/fixtureResponses.ts";
import { exampleFlashcard } from "../exampleFlashcard.ts";

/** A backend that answers every flashcard save with the failure of the given status. */
const failingSaves = (status: number) =>
  createFakeBackendClient({
    ...fixtureResponses,
    "POST /projects/p1/flashcards": fakeFailure({
      status,
      message: "The flashcard could not be saved.",
    }),
  });

/**
 * Saves a flashcard for each word on m1 of the fixture project, whose saves the story's backend does not accept,
 * so that the app's notice region lists them in the status line, or shows a refused save's own notice.
 */
function FailedSaves({ words }: { words: readonly string[] }) {
  const dispatch = useAppDispatch();
  useEffect(() => {
    dispatch(actions.openMediaFileRequested("p1", "m1"));
    for (const word of words)
      dispatch(
        actions.flashcardStarted(
          {
            id: `story-${word}`,
            draft: {
              media_file_id: "m1",
              cue_index: 1,
              word_start: null,
              content: { ...exampleFlashcard, word },
              included_fields: ["word"],
            },
          },
          "save",
        ),
      );
  }, [dispatch, words]);
  return <p className="p-4 text-fg-muted">The screen beneath.</p>;
}

const meta = {
  title: "Flashcards/FailedSavesStatus",
  component: FailedSaves,
  decorators: [withAppStore],
  args: { words: ["fressen", "schlafen"] },
  parameters: { appStore: { client: failingSaves(500) } },
} satisfies Meta<typeof FailedSaves>;

export default meta;
type Story = StoryObj<typeof meta>;

export const SeveralNotSaved: Story = {};

export const OneRefusedByTheServer: Story = {
  args: { words: ["fressen"] },
  parameters: { appStore: { client: failingSaves(422) } },
};
