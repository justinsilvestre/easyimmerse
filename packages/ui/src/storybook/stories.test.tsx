import { composeStories, setProjectAnnotations } from "@storybook/react-vite";
import { cleanup, render } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import preview from "../../.storybook/preview.ts";

setProjectAnnotations(preview);

const storyFiles = import.meta.glob<Parameters<typeof composeStories>[0]>(
  "../**/*.stories.tsx",
  { eager: true },
);

afterEach(cleanup);

// Renders each story with its decorators and args but not its play function, which may wait on layout this environment does not compute.
describe.each(Object.entries(storyFiles))("the stories in %s", (_, file) => {
  it.each(Object.entries(composeStories(file)))(
    "render %s without throwing",
    (_, Story) => {
      expect(() => render(<Story />)).not.toThrow();
    },
  );
});
