import { Provider } from "react-redux";
import { HomeScreen } from "./screens/HomeScreen.tsx";
import { SystemStatusScreen } from "./screens/SystemStatusScreen.tsx";
import type { Screen } from "./state/AppState.ts";
import type { AppStore } from "./state/createAppStore.ts";
import { useAppSelector } from "./state/hooks.ts";

const screensComponents: Record<Screen, () => React.JSX.Element> = {
  home: HomeScreen,
  systemStatus: SystemStatusScreen,
};

/** The user interface of easyImmerse, shared between all platforms. */
export function App({ store }: { store: AppStore }) {
  return (
    <Provider store={store}>
      <CurrentScreen />
    </Provider>
  );
}

function CurrentScreen() {
  const screen = useAppSelector((state) => state.app.screen);
  const ScreenComponent = screensComponents[screen];
  return <ScreenComponent />;
}
