---
paths:
  - "packages/ui/src/**/*.tsx"
  - "packages/ui/src/**/*.ts"
---

# UI colors

- Color components with the semantic tokens defined in `packages/ui/src/styles.css` (`bg-canvas`, `bg-surface`, `text-fg-muted`, `border-line`, `bg-accent`, `text-danger-fg`, and so on). The dark theme redefines these tokens, so most components need no `dark:` classes.
- When a color belongs to one place only, such as the reader's stone palette, the search highlight, or a modal backdrop, use palette classes with a `dark:` counterpart instead of adding a token. Add a token only for a color that several components share.
- The media screen is dark in both themes and uses palette colors without `dark:` counterparts.
- Check new components in both themes with the Theme switch in the Storybook toolbar.
