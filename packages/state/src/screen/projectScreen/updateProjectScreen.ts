import type { AppAction } from "../../app/appAction.ts";
import type { Effect } from "../../app/effect.ts";
import type { MainRoute } from "../../route/route.ts";
import { isSettled } from "../../server/isSettled.ts";
import type { ProjectScreenState } from "../screenState.ts";
import { existingNamed } from "./mediaFileOpenedByPick.ts";
import { mediaFilePickRequestIds } from "./mediaFilePickRequestIds.ts";

type ProjectRoute = Extract<MainRoute, { screen: "project" }>;

/**
 * Adds a picked media file to the project, unless a file of that name is already there.
 * The route then opens the added file or the existing one (see `mediaFileOpenedByPick`), which replaces this screen.
 */
export function updateProjectScreen(
  screen: ProjectScreenState,
  action: AppAction,
  route: ProjectRoute,
): readonly [ProjectScreenState, readonly Effect[]] {
  const { projectId } = route;
  const ids = mediaFilePickRequestIds(projectId);
  const pending = screen.pendingMediaFile;
  switch (action.type) {
    case "mediaFileChosen":
      return [
        { ...screen, pendingMediaFile: action.file },
        [
          {
            type: "sendRequest",
            id: ids.list,
            request: { kind: "listMediaFiles", projectId },
          },
        ],
      ];
    case "requestSettled":
      if (pending === null) return [screen, []];
      if (isSettled(action, ids.list, "listMediaFiles"))
        // A list that fails to load lets the file be sent anyway.
        return action.outcome.ok &&
          existingNamed(action.outcome.data, pending.name)
          ? [
              { ...screen, pendingMediaFile: null },
              [
                {
                  type: "showNotification",
                  message: `“${pending.name}” is already in the project.`,
                },
              ],
            ]
          : [
              screen,
              [
                {
                  type: "sendRequest",
                  id: ids.add,
                  request: {
                    kind: "addMediaFile",
                    projectId,
                    request: pending,
                  },
                },
              ],
            ];
      if (isSettled(action, ids.add, "addMediaFile"))
        return [{ ...screen, pendingMediaFile: null }, []];
      return [screen, []];
    default:
      return [screen, []];
  }
}
