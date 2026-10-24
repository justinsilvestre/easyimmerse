import type { Meta, StoryObj } from "@storybook/react-vite";
import { withAppStore } from "../storybook/withAppStore.tsx";
import {
  builtInServerOn,
  createBuiltInServerClient,
} from "../testSupport/createBuiltInServerClient.ts";
import { fixtureSyncLink } from "../testSupport/fixtureResponses.ts";
import { ProfileMenu } from "./ProfileMenu.tsx";

/** The desktop app's built-in server, linked to an account on the easyImmerse cloud. */
const loggedIn = {
  appStore: {
    server: builtInServerOn("desktop"),
    cloudUrl: fixtureSyncLink.server_url,
    client: createBuiltInServerClient(fixtureSyncLink),
  },
};

const meta = {
  title: "Layout/ProfileMenu",
  component: ProfileMenu,
  decorators: [
    withAppStore,
    (Story) => (
      <div className="flex justify-end p-4 pb-72">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof ProfileMenu>;

export default meta;
type Story = StoryObj<typeof meta>;

export const LoggedOut: Story = {};

export const LoggedOutOpen: Story = { args: { isInitiallyOpen: true } };

export const LoggedIn: Story = { parameters: loggedIn };

export const LoggedInOpen: Story = {
  args: { isInitiallyOpen: true },
  parameters: loggedIn,
};
