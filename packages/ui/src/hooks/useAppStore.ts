import type { AppStore } from "@easyimmerse/state";
import { useStore } from "react-redux";

/** Returns the store, for reading state at the moment of an event without re-rendering when it changes. */
export const useAppStore = useStore.withTypes<AppStore>();
