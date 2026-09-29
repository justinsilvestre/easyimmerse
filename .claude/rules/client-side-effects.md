---
paths:
  - "packages/client/**"
---

# Side effects in the shared client

The code in `packages/client` runs on every platform: web, desktop, mobile, and browser extension.

- Do not call platform-specific APIs here, such as those of Tauri or of browser extensions.
- Do not carry out side effects in components or in `updateApp`. Instead:
  - For requests to the API server, add an endpoint to `serverApi`.
  - For any other side effect, add an effect creator to `effects`, return the effect from `updateApp`,
    and implement its runner in the effects runners of each app under `apps/`.
- Do not use the store setup or slices of Redux Toolkit. Only RTK Query is used from that package.
  Add new actions to the `appActions` record, from which the type of all app actions is derived.
