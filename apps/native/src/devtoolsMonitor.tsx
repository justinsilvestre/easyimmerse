import { RECONNECT, Root } from "@redux-devtools/app";
import { createRoot } from "react-dom/client";
import { reduxDevToolsServer } from "./reduxDevToolsServer.ts";

/**
 * Mounts the Redux DevTools monitor, which the native Vite server serves at /devtools.html in development.
 * It shows the store of any app connected to the Redux DevTools server.
 */
function mountMonitor(): void {
  const root = document.getElementById("root");
  if (root === null) throw new Error("devtools.html has no #root element.");
  createRoot(root).render(<Root ref={connectWhenRestored} />);
}

/**
 * Connects the monitor to the server once its saved settings are restored, unless they set a connection already.
 * The monitor starts with its connection disabled, so without this a first visit would show nothing.
 */
function connectWhenRestored(monitor: Root | null): void {
  const { store, persistor } = monitor ?? {};
  if (store === undefined || persistor === undefined) return;
  whenRestored(persistor, () => connectIfDisabled(store));
}

function whenRestored(
  persistor: NonNullable<Root["persistor"]>,
  callback: () => void,
): void {
  const unsubscribe = persistor.subscribe(callIfRestored);
  callIfRestored();
  function callIfRestored() {
    if (!persistor.getState().bootstrapped) return;
    unsubscribe();
    callback();
  }
}

function connectIfDisabled(store: NonNullable<Root["store"]>): void {
  if (store.getState().connection.type !== "disabled") return;
  store.dispatch({
    type: RECONNECT,
    options: { type: "custom", ...reduxDevToolsServer, secure: false },
  });
}

mountMonitor();
