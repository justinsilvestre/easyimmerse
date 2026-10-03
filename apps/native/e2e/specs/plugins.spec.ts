import { browser, expect } from "@wdio/globals";

/** What the `check_plugin_host` command returns; see `apps/native/src-tauri/src/plugin_check.rs`. */
interface PluginHostCheck {
  greeting: string;
  executionMode: string;
}

// The embedded WebDriver server does not await a promise returned from a synchronous script,
// so the command's result comes back through the asynchronous script's callback.
// The Tauri service declares `window.__TAURI__` with every member optional.
function checkPluginHost(): Promise<PluginHostCheck> {
  return browser.executeAsync((done: (result: unknown) => void) => {
    const invoke = window.__TAURI__?.core?.invoke;
    if (!invoke) {
      done(new Error("the global Tauri object is missing"));
      return;
    }
    invoke("check_plugin_host").then(done, done);
  }) as Promise<PluginHostCheck>;
}

describe("the plugin host", () => {
  it("greets through the embedded hello-rust plugin", async () => {
    expect((await checkPluginHost()).greeting).toBe("Hello, world");
  });

  it("reports the execution mode it ran the plugin in", async () => {
    expect(typeof (await checkPluginHost()).executionMode).toBe("string");
  });
});
