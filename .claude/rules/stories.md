---
paths:
  - "**/*.stories.tsx"
---

# Storybook stories

- Write stories in Component Story Format 3: `const meta = { title, component } satisfies Meta<typeof Component>`, `export default meta`, `type Story = StoryObj<typeof meta>`, and one named export per story. Import the types from `@storybook/react-vite`.
- Put the stories file next to the component it renders, named `<Component>.stories.tsx`.
- Title stories by folder and component name, for example `Components/Button` or `Screens/HomeScreen`.
- Write one story for each state a person would recognize, such as empty, loaded, or disabled. Do not write one story per prop. Put shared props in `meta.args` and set only the differences in each story.
- Pass event handlers as `fn()` from `storybook/test` so calls appear in the Actions panel.
- Render a component that reads from the store inside the `withAppStore` decorator from `src/storybook/withAppStore.tsx`. Let it dispatch real actions to that store. Do not mock `useAppDispatch`, `useAppSelector`, or other hooks.
- When designing a new component, write its story first to settle the props, then implement the component until the story renders as intended.
- Keep stories free of test assertions and `play` functions that check results. Behavior belongs in `<name>.test.tsx` files.
