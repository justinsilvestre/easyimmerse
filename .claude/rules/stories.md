---
paths:
  - "**/*.stories.tsx"
---

# Storybook stories

- Write stories in Component Story Format 3 with the `Meta` and `StoryObj` types from `@storybook/react-vite`, one named export per story.
- Put the stories file next to the component it renders, named `<Component>.stories.tsx`, and title it by folder and component name, for example `Components/Button` or `Screens/HomeScreen`.
- Write one story for each state a person would recognize, such as empty, loaded, or disabled. Do not write one story per prop. Put shared props in `meta.args` and set only the differences in each story.
- Pass event handlers as `fn()` from `storybook/test` so calls appear in the Actions panel.
- Render a component that reads from the store inside the `withAppStore` decorator from `packages/ui/src/storybook/withAppStore.tsx`, and let it dispatch real actions to that store. Do not mock `useAppDispatch`, `useAppSelector`, or other hooks.
- When designing a new component, write its story first to settle the props, then implement the component until the story renders as intended.
- Keep stories free of assertions and of `play` functions that check results. Behavior belongs in `<name>.test.tsx` files.
