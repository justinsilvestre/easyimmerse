import { sharedVitePlugins } from "@easyimmerse/config/vite-plugins";
import { defineMain } from "@storybook/react-vite/node";
import { mergeConfig } from "vite";

export default defineMain({
  framework: "@storybook/react-vite",
  stories: ["../src/**/*.stories.tsx"],
  addons: ["@storybook/addon-a11y"],
  core: { disableTelemetry: true },
  viteFinal: (config) => mergeConfig(config, { plugins: sharedVitePlugins() }),
});
