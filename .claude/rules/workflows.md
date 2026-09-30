---
paths:
  - ".github/**"
---

# GitHub Actions

- Every job starts with the composite action in `.github/actions/setup`, which installs tools through Mise and restores the Rust, pnpm, and Playwright caches.
- Jobs run on every pull request. Restrict a slow job to the main branch by changing its `on:` block only.
- Pin actions to a major version tag.
