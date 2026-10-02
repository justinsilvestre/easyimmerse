# easyImmerse

A free, cross-platform suite for learning languages through native media: videos, audiobooks, and ebooks become learning material with instant word lookups and rich flashcards. See [docs/overview.md](docs/overview.md) for what the product does.

## Prerequisites

- [Mise](https://mise.jdx.dev) manages every tool version (Node, pnpm, Rust, WebAssembly tooling).
- On Linux, the desktop app additionally needs the [Tauri system dependencies](https://v2.tauri.app/start/prerequisites/).

## Getting started

```sh
mise install          # tools
pnpm install          # Node dependencies
mise run wasm:build   # the offline WebAssembly module, needed by the web app and the extension
mise run plugins:build   # the example plugins, needed by the plugin host tests
mise run check        # lint, typecheck, and test every layer
```

Other tasks are listed by `mise tasks`. The most useful ones:

| Task | What it does |
|---|---|
| `mise run typegen` and `mise run openapi` | Regenerate the TypeScript types and the OpenAPI document from Rust. CI fails when the committed output is stale. |
| `mise run e2e` | Browser end-to-end tests for the web app and the extension. |
| `mise run fetch-ffmpeg` | Download the ffmpeg sidecar for the desktop app. |
| `mise run web-dev` | Web app with hot reloading, connected to a local server at `http://127.0.0.1:8788` with the token `dev`. The server keeps its data in `.dev/server.sqlite` and seeds two placeholder projects when that file is new. Delete `.dev/` to start over. |
| `mise run desktop` | Desktop app with its embedded server. Fetches the ffmpeg sidecar first if it is missing. The app loads its frontend from a Vite dev server, so it also reloads on change. |

## Layout

| Directory | Contents |
|---|---|
| `apps/` | The web app, the Tauri desktop and mobile app, the browser extension, and the standalone server. |
| `crates/` | Rust workspace: domain logic, media handling, storage, the plugin host, the HTTP API, and the WebAssembly facade. |
| `packages/` | TypeScript workspace: generated types, the Redux store, the RTK Query backend, the UI, and per-platform effects. |
| `plugins/` | Example plugins used only by tests. |
| `fixtures/` | Small sample files shared by every layer's tests. |
| `scripts/` | Setup scripts. |

## License

AGPL-3.0-only. See [LICENSE](LICENSE).

The plugin interface in `crates/plugin-api` is licensed MIT, so that plugins under any license can build against it. See [crates/plugin-api/LICENSE](crates/plugin-api/LICENSE).
