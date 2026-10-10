import type { AppState } from "../app/appState.ts";
import type { MediaRoute } from "../route/route.ts";
import type { FormStepBuilder } from "./formStep.ts";

/** What the form's rules read and write as they run: the state before the action, the screen's route, and the step they build. */
export type FormContext = {
  app: AppState;
  route: MediaRoute;
  step: FormStepBuilder;
};
