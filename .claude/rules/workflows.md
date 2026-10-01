---
paths:
  - ".github/**"
---

# GitHub Actions

- Every job starts with the composite action in `.github/actions/setup`, which installs tools through Mise and restores the Rust, pnpm, and Playwright caches.
- Every workflow lists the paths that can affect it under `on.pull_request.paths` and `on.push.paths`, and the same list appears in both places. When a job gains a new input directory, add it to both lists. The shared tooling files (`mise.toml`, the Cargo and pnpm manifests and lockfiles, `.cargo/`, and this action) appear in every list.
- Because of those filters, a workflow that is irrelevant to a pull request never reports a status. Do not mark these workflows as required status checks in branch protection without adding a fallback job, or unrelated pull requests can never merge.
- Pin actions to a major version tag.
