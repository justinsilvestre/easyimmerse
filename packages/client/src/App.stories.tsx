import type { Meta, StoryObj } from "@storybook/react-vite";
import { App } from "./App.tsx";
import { createStubStore } from "./createStubStore.ts";
import { appActions } from "./state/appActions.ts";

const meta = {
  component: App,
} satisfies Meta<typeof App>;

export default meta;

function createSystemStatusStore() {
  const store = createStubStore(null);
  store.dispatch(appActions.screenOpened("systemStatus"));
  return store;
}

export const Home: StoryObj<typeof meta> = {
  args: { store: createStubStore(null) },
};

export const SystemStatus: StoryObj<typeof meta> = {
  args: { store: createSystemStatusStore() },
};
