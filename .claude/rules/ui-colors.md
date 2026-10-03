---
paths:
  - "packages/ui/src/**/*.tsx"
  - "packages/ui/src/**/*.ts"
---

# UI colors

- Color components with the semantic tokens defined in `packages/ui/src/styles.css` (`bg-canvas`, `bg-surface`, `text-fg-muted`, `border-line`, `bg-accent`, `text-danger-fg`, and so on). The dark theme redefines these tokens, so components need no `dark:` classes.
- Use palette colors such as `gray-500` or `blue-600` only where a color must stay the same in both themes: the media screen, which is dark in both themes, and decorative fills such as artwork gradients.
- When no token fits, add one to `styles.css` with both a light and a dark value rather than reaching for a palette color.
- Check new components in both themes with the Theme switch in the Storybook toolbar.
