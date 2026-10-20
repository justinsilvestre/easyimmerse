import type { AppAction } from "../app/appAction.ts";
import { dispatch } from "../app/dispatchEffect.ts";
import { routeActions } from "../route/routeActions.ts";
import { raiseAllowance } from "./reviewRequests.ts";

/**
 * Returns the review requests an action asks for outside the review screen:
 * reviewing more today from the project, which raises today's allowance of reviews before the review opens and fetches its queue.
 */
export function reviewCommands(action: AppAction) {
  if (action.type !== "projectReviewMoreRequested") return [];
  const { projectId, reviewCount } = action;
  return [
    raiseAllowance(projectId, { newCards: 0, reviews: reviewCount }),
    dispatch(routeActions.navigated({ type: "openReview", projectId })),
  ];
}
