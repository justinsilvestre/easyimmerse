---
paths:
  - "crates/plugin-api/**"
---

# Plugin API license

This crate is licensed MIT, unlike the rest of the repository, so that plugins under any license can build against its WIT files.
Everything added here is published under MIT.

- Add only the plugin interface and the bindings generated from it. Keep application logic, dictionary code, and anything else that should stay under the repository's own license out of this crate.
- Never add code or text derived from GPL or other copyleft sources, such as Yomitan.
- Keep `license = "MIT"` in `Cargo.toml` and the crate's `LICENSE` file.
