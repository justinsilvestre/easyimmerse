---
paths:
  - ".github/**"
---

# GitHub Actions

- Every job except `gate` and `record` starts with the composite action in `.github/actions/setup`, which installs tools through Mise and restores the Rust, pnpm, and Playwright caches. A job that only moves files with git, such as a deployment, may skip it and says so in a comment.
- Every workflow lists the paths that can affect it under `on.pull_request.paths` and `on.push.paths`, and the same list appears in both places. When a job gains a new input directory, add it to both lists. The shared tooling files (`mise.toml`, the Cargo and pnpm manifests and lockfiles, `.cargo/`, and this action) appear in every list.
- Because of those filters, a workflow that is irrelevant to a pull request never reports a status. Do not mark these workflows as required status checks in branch protection without adding a fallback job, or unrelated pull requests can never merge.
- A `gate` job runs first in every pull-request workflow. It hashes the files that `on.pull_request.paths` (or `paths-ignore`) selects and checks whether an earlier run passed on the same hash. Every other job has `needs: gate` and `if: needs.gate.outputs.passed != 'true'`, and a final `record` job lists every job in `needs` and saves the marker. Add each new job to the `record` job's `needs`, or the workflow records a pass without running it. A job that runs only on an event the gate does not cover, such as a closed pull request, stays outside the gate and the `record` job.
- The gate reads path filters as git glob pathspecs, so each pattern must mean the same thing to GitHub and to git. Write `**/*.md` rather than `**.md`.
- Pin actions to a major version tag.
