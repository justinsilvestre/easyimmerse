# easyImmerse browser extension

A WXT project that mounts the shared screens in a browser side panel. It contains only entrypoints and glue; the screens, store, and API definitions live in `packages/`.

## Building

```
pnpm --filter @easyimmerse/extension build            # Chrome, into .output/chrome-mv3
pnpm --filter @easyimmerse/extension build:firefox    # Firefox, into .output/firefox-mv3
```

Set `VITE_EASYIMMERSE_SERVER_URL` and `VITE_EASYIMMERSE_TOKEN` before building to point the extension at a server. Without them it runs offline through the WebAssembly module, which `mise run wasm:build` produces.

## Loading the unpacked extension

Chrome: open `chrome://extensions`, enable developer mode, choose "Load unpacked", and select `.output/chrome-mv3`. Clicking the toolbar button opens the side panel.

Firefox: open `about:debugging#/runtime/this-firefox`, choose "Load Temporary Add-on", and select `.output/firefox-mv3/manifest.json`. The panel appears in the sidebar, which the sidebar toggle in the toolbar shows.

## Tests

`pnpm --filter @easyimmerse/extension e2e` builds the Chrome extension against the end-to-end test server, loads it into Chromium with Playwright, and opens the side panel page directly. Playwright cannot load Firefox extensions, so Firefox is covered in CI by a build and `web-ext lint` only.
