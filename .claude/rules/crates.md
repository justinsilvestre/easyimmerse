---
paths:
  - "crates/**"
  - "apps/server/**"
  - "apps/native/src-tauri/**"
---

# Rust crates

- Crate names carry the `easyimmerse-` prefix; directory names omit it.
- Every type that crosses HTTP derives `Debug, Clone, PartialEq, Serialize, Deserialize, TS, ToSchema` and is marked `#[ts(export)]`. Types used only on the wasm path derive `TS` but not `ToSchema`.
- Timestamps and durations are `u64` milliseconds.
- Errors are `thiserror` enums, one per module. Do not `unwrap` or `expect` outside tests.
- `crates/core`, `crates/media`, and `crates/wasm` must compile for `wasm32-unknown-unknown`, so they take no tokio, SQLite, ffmpeg, or filesystem dependencies.
- Unit tests live inline under `#[cfg(test)]`. Tests that start a server or load a plugin live in `tests/`.
- Tests read fixtures through a path built from `CARGO_MANIFEST_DIR`, never a relative path.
