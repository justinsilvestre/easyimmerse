---
paths:
  - "plugins/**"
  - "crates/plugin-api/wit/**"
---

# Plugins and WIT

- The WIT package is `easyimmerse:plugin@0.1.0`. Each interface has its own `.wit` file; worlds are declared only in `worlds.wit`.
- Changing an interface is a breaking change for every plugin built against it. Bump the package version rather than editing a released interface.
- Guest builds write `plugin.wasm`, a copy of `plugin.toml`, and the `bin/` directory when present into `plugins/<name>/dist/`, which is gitignored. Host tests load plugins from there and fail with a message naming `mise run plugins:build` when it is missing.
- Plugins orchestrate; they do not do heavy computation.
