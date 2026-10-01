# easyImmerse

A monorepo with a Rust backend (`crates/`, `apps/server`, `apps/native/src-tauri`) and a TypeScript frontend (`packages/`, `apps/web`, `apps/native`, `apps/extension`). Conventions that apply to a whole directory live in `.claude/rules/`.

## Working here

- Run Node tooling through Mise: `mise exec -- pnpm ...`, or `mise run <task>`. `mise tasks` lists the tasks.
- `mise run check` is the full local gate. Run the narrowest relevant command while iterating (`cargo test -p <crate>`, `pnpm --filter <pkg> test`).
- Rust types are the source of truth. After changing a type that crosses HTTP or wasm, run `mise run typegen` and `mise run openapi` and commit the regenerated files. CI fails when they are stale.

## Where things are

- Domain logic and shared types: `crates/core`.
- HTTP routes: `crates/api/src/routes/`. Each route carries its utoipa annotation.
- Redux store, actions, update functions, and the `Effects` interface: `packages/state`.
- RTK Query endpoints: `packages/backend/src/backendApi.ts`.
- Screens and components: `packages/ui`. Their stories sit next to them as `<Component>.stories.tsx`; `mise run storybook` serves them.
- Per-platform side effects: `packages/effects-web`, `packages/effects-native`, `packages/effects-extension`.
- Plugin interfaces (WIT): `crates/plugin-api/wit/`. Plugin host: `crates/plugins`.
