import { actions } from "@easyimmerse/state";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { fn } from "storybook/test";
import { withAppStore } from "../../storybook/withAppStore.tsx";
import { withDispatchedActions } from "../../storybook/withDispatchedActions.tsx";
import {
  createFakeBackendClient,
  fakeFailure,
} from "../../testSupport/createFakeBackendClient.ts";
import { fixtureResponses } from "../../testSupport/fixtureResponses.ts";
import { ConnectedReviewScreen } from "./ConnectedReviewScreen.tsx";

/** The review of the fixture project, whose queue holds three new cards. Rate them with the buttons or the keys. */
const meta = {
  title: "Screens/Review/ConnectedReviewScreen",
  component: ConnectedReviewScreen,
  decorators: [
    withDispatchedActions(
      actions.navigated({ type: "openReview", projectId: "p1" }),
    ),
    withAppStore,
  ],
  parameters: { layout: "fullscreen" },
  args: { projectId: "p1", onBack: fn() },
} satisfies Meta<typeof ConnectedReviewScreen>;

export default meta;
type Story = StoryObj<typeof meta>;

export const ThreeNewCards: Story = {};

/** The server could not give the session's cards. */
export const FailedToLoad: Story = {
  parameters: {
    appStore: {
      client: createFakeBackendClient({
        ...fixtureResponses,
        "GET /projects/p1/review/queue": fakeFailure({
          status: 500,
          message: "The server failed.",
        }),
      }),
    },
  },
};
