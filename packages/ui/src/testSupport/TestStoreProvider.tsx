import type { ReactNode } from "react";
import { useState } from "react";
import { Provider } from "react-redux";
import { createTestAppStore } from "./createTestAppStore.ts";

/** Provides a fresh test store, for components that render connected parts such as the notice region. Pass it as `render`'s `wrapper`. */
export function TestStoreProvider({ children }: { children: ReactNode }) {
  const [{ store }] = useState(() => createTestAppStore());
  return <Provider store={store}>{children}</Provider>;
}
