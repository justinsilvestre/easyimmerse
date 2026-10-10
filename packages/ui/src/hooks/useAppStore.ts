import type { AppStore } from "@easyimmerse/state";
import { useStore } from "react-redux";

export const useAppStore = useStore.withTypes<AppStore>();
