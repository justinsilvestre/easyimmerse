# easyImmerse

A monorepo with a Rust backend (`crates/`, `apps/server`, `apps/native/src-tauri`) and a TypeScript frontend (`packages/`, `apps/web`, `apps/native`, `apps/extension`). Conventions that apply to a whole directory live in `.claude/rules/`.

## Working here

- Run Node tooling through Mise: `mise exec -- pnpm ...`, or `mise run <task>`. `mise tasks` lists the tasks.
- `mise run check` is the full local gate. Run the narrowest relevant command while iterating (`cargo test -p <crate>`, `pnpm --filter <pkg> test`).
- Rust types are the source of truth. After changing a type that crosses HTTP or wasm, run `mise run typegen` and `mise run openapi` and commit the regenerated files. CI fails when they are stale.
- Cargo on a shared machine: run every cargo or `mise run` command in the background and wait for its notification instead of polling. Build one crate at a time (`cargo test -p <crate>`, `cargo clippy -p <crate>`); run cold or workspace-wide jobs through `scripts/cargo-heavy.sh`, which lets one such job run at a time. Pass `--features plugins` to the api crate only for `--test deinflection_plugin`. Before the first build in a new worktree, run `scripts/seed-worktree-target.sh <worktree>` from the main checkout.
- Each crate's integration tests form one binary, named after the crate. Run one module with `cargo test -p easyimmerse-api --test api waveform::`.

## Where things are

- Domain logic and shared types: `crates/core`.
- HTTP routes: `crates/api/src/routes/`. Each route carries its utoipa annotation.
- Redux store, actions, update functions, and the `Effects` interface: `packages/state`.
- RTK Query endpoints: `packages/backend/src/backendApi.ts`.
- Screens and components: `packages/ui`. Their stories sit next to them as `<Component>.stories.tsx`; `mise run storybook` serves them.
- Per-platform side effects: `packages/effects-web`, `packages/effects-native`, `packages/effects-extension`.
- Plugin interfaces (WIT): `crates/plugin-api/wit/`. Plugin host: `crates/plugins`.
