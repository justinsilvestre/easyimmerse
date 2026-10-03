import { browser, expect } from "@wdio/globals";

/** What the `check_plugin_host` command returns; see `apps/native/src-tauri/src/plugin_check.rs`. */
interface PluginHostCheck {
  greeting: string;
  executionMode: string;
}

/** The command's outcome as the page reports it. An error crosses WebDriver only as text. */
type InvokeOutcome = { result: PluginHostCheck } | { error: string };

// The embedded WebDriver server does not await a promise returned from a synchronous script,
// so the outcome comes back through the asynchronous script's callback.
// The Tauri service declares `window.__TAURI__` with every member optional.
async function checkPluginHost(): Promise<PluginHostCheck> {
  const outcome = await browser.executeAsync<InvokeOutcome, []>(
    (done: (outcome?: InvokeOutcome) => void) => {
      const invoke = window.__TAURI__?.core?.invoke;
      if (!invoke) {
        done({ error: "the global Tauri object is missing" });
        return;
      }
      invoke("check_plugin_host").then(
        (result) => done({ result: result as PluginHostCheck }),
        (error) => done({ error: String(error) }),
      );
    },
  );
  if ("error" in outcome) {
    throw new Error(`check_plugin_host failed: ${outcome.error}`);
  }
  return outcome.result;
}

describe("the plugin host", () => {
  it("greets through the embedded hello-rust plugin", async () => {
    expect((await checkPluginHost()).greeting).toBe("Hello, world");
  });

  it("reports the execution mode it ran the plugin in", async () => {
    expect(typeof (await checkPluginHost()).executionMode).toBe("string");
  });
});
