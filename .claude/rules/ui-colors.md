---
paths:
  - "packages/ui/src/**/*.tsx"
  - "packages/ui/src/**/*.ts"
---

# UI colors

- Color components with the semantic tokens defined in `packages/ui/src/styles.css` (`bg-canvas`, `bg-surface`, `text-fg-muted`, `border-line`, `bg-accent`, `text-danger-fg`, and so on). The dark theme redefines these tokens, so components need no `dark:` classes.
- A subtree that must stay dark in both themes, such as the media screen, sets `data-theme="dark"` on its root element; the tokens then resolve to their dark values inside it, so its components need no palette colors either.
- Use palette colors such as `gray-500` or `blue-600` only where the surroundings are fixed rather than themed: text and backdrops drawn over video, the black stage behind it, the dialog backdrop, and decorative fills such as artwork gradients.
- The reader sets `data-theme` to `light`, `sepia`, or `dark` on its root for the reading theme the user chose, and leaves it unset to follow the app. `styles.css` defines all three for a subtree.
- When no token fits, add one to `styles.css` with both a light and a dark value rather than reaching for a palette color.
- Check new components in both themes with the Theme switch in the Storybook toolbar.
