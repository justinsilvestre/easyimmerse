import type { RootState } from "../../app/createAppStore.ts";
import {
  initialReaderScreen,
  type ReaderScreenState,
} from "./readerScreenState.ts";

/** Returns the reader's state, or its defaults while no media screen is open. */
export const selectReaderScreen = (state: RootState): ReaderScreenState =>
  state.app.screen.main.kind === "media"
    ? state.app.screen.main.reader
    : initialReaderScreen;
