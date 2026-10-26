import { describe, expect, it } from "vitest";
import type { Route } from "./route.ts";
import { navigate } from "./route.ts";
import { upRouteOf } from "./upRouteOf.ts";

const project: Route = { screen: "project", projectId: "p1" };

const settings = navigate(project, { type: "openSettings" });

const routesWithUps: readonly [Route, Route | null][] = [
  [{ screen: "home" }, null],
  [{ screen: "offline" }, { screen: "home" }],
  [{ screen: "newProject" }, { screen: "home" }],
  [project, { screen: "home" }],
  [{ screen: "library" }, { screen: "home" }],
  [{ screen: "projectSettings", projectId: "p1" }, project],
  [{ screen: "review", projectId: "p1" }, project],
  [{ screen: "media", projectId: "p1", mediaFileId: "m1" }, project],
  [{ screen: "libraryItem", itemId: "i1" }, { screen: "library" }],
  [{ screen: "libraryManage" }, { screen: "library" }],
  [{ screen: "libraryEdit", itemId: "i1" }, { screen: "libraryManage" }],
  [settings, project],
  [navigate(settings, { type: "openAccountSettings" }), settings],
];

describe("upRouteOf", () => {
  it.each(routesWithUps)("leads from %j to %j", (route, up) => {
    expect(upRouteOf(route)).toEqual(up);
  });
});
