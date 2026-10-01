import type { BackendClient } from "@easyimmerse/backend";
import {
  backendStoreParts,
  configureBackend,
  createHttpBackendClient,
  createWasmBackendClient,
  resolveServerConfig,
} from "@easyimmerse/backend";
import { createWebEffects } from "@easyimmerse/effects-web";
import type { EnhancerComposer } from "@easyimmerse/state";
import {
  createAppStore,
  createDevToolsComposer,
  createPlayerRegistry,
} from "@easyimmerse/state";
import { AppRoot } from "@easyimmerse/ui";
import { loadOfflineWasm } from "@easyimmerse/wasm";
import wasmUrl from "@easyimmerse/wasm/pkg/easyimmerse_wasm_bg.wasm?url";
import { createRoot } from "react-dom/client";
import "@easyimmerse/ui/styles.css";

/** Wires the backend, effects, and store together and mounts the app. */
export async function bootstrap(): Promise<void> {
  configureBackend(await createBackendClient());
  const playerRegistry = createPlayerRegistry();
  const effects = createWebEffects({ playerRegistry });
  const store = createAppStore(
    effects,
    backendStoreParts,
    findDevToolsComposer(),
  );
  createRoot(findRootElement()).render(
    <AppRoot store={store} playerRegistry={playerRegistry} />,
  );
}

async function createBackendClient(): Promise<BackendClient> {
  const config = resolveServerConfig();
  if (config !== null) return createHttpBackendClient(config);
  return createWasmBackendClient(await loadOfflineWasm(wasmUrl));
}

/** Connects the store to the Redux DevTools browser extension in development, when the extension is installed. */
function findDevToolsComposer(): EnhancerComposer | undefined {
  if (!import.meta.env.DEV) return undefined;
  const extensionCompose = window.__REDUX_DEVTOOLS_EXTENSION_COMPOSE__;
  return extensionCompose && createDevToolsComposer(extensionCompose);
}

function findRootElement(): HTMLElement {
  const root = document.getElementById("root");
  if (root === null) throw new Error("index.html has no #root element.");
  return root;
}
