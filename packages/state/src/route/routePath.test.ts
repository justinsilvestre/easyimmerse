import { describe, expect, it } from "vitest";
import type { Route } from "./route.ts";
import { pathOfRoute, routeOfPath } from "./routePath.ts";

const project: Route = { screen: "project", projectId: "p1" };

const routesWithPaths: readonly [Route, string][] = [
  [{ screen: "home" }, "/"],
  [{ screen: "offline" }, "/offline"],
  [{ screen: "newProject" }, "/projects/new"],
  [project, "/projects/p1"],
  [{ screen: "projectSettings", projectId: "p1" }, "/projects/p1/settings"],
  [{ screen: "review", projectId: "p1" }, "/projects/p1/review"],
  [
    { screen: "media", projectId: "p1", mediaFileId: "m1" },
    "/projects/p1/media/m1",
  ],
  [{ screen: "library" }, "/library"],
  [{ screen: "libraryItem", itemId: "i1" }, "/library/items/i1"],
  [{ screen: "libraryManage" }, "/library/manage"],
  [{ screen: "libraryEdit", itemId: "i1" }, "/library/manage/i1"],
  [
    { screen: "settings", beneath: project, pages: ["general"] },
    "/projects/p1?settings=general",
  ],
  [
    {
      screen: "settings",
      beneath: { screen: "home" },
      pages: ["general", "account", "linkedRemoteUsers"],
    },
    "/?settings=general,account,linked-remote-users",
  ],
];

describe("pathOfRoute", () => {
  it.each(routesWithPaths)("writes %j as %s", (route, path) => {
    expect(pathOfRoute(route)).toBe(path);
  });

  it("encodes the characters of an id that a path cannot hold", () => {
    expect(pathOfRoute({ screen: "project", projectId: "a/b c" })).toBe(
      "/projects/a%2Fb%20c",
    );
  });

  it("leaves out the section the general settings scroll to", () => {
    expect(
      pathOfRoute({
        screen: "settings",
        beneath: project,
        pages: ["general"],
        scrollTarget: "mediaConversion",
      }),
    ).toBe("/projects/p1?settings=general");
  });
});

describe("routeOfPath", () => {
  it.each(routesWithPaths)("reads %j from %s", (route, path) => {
    expect(routeOfPath(path)).toEqual(route);
  });

  it("decodes an encoded id", () => {
    expect(routeOfPath("/projects/a%2Fb%20c")).toEqual({
      screen: "project",
      projectId: "a/b c",
    });
  });

  it("reads the settings pages from an encoded comma", () => {
    expect(routeOfPath("/?settings=general%2Caccount")).toEqual({
      screen: "settings",
      beneath: { screen: "home" },
      pages: ["general", "account"],
    });
  });

  it("ignores the query parameters it does not know", () => {
    expect(routeOfPath("/projects/p1?confirm_email=abc")).toEqual(project);
  });

  it("ignores a slash at the end", () => {
    expect(routeOfPath("/projects/p1/")).toEqual(project);
  });

  it("returns null for a path that names no screen", () => {
    expect(routeOfPath("/elsewhere")).toBeNull();
  });

  it("returns null for a path with more parts than a screen's", () => {
    expect(routeOfPath("/projects/p1/media/m1/extra")).toBeNull();
  });

  it("returns null for an id that cannot be decoded", () => {
    expect(routeOfPath("/projects/%E0%A4%A")).toBeNull();
  });

  it("returns null for a settings page it does not know", () => {
    expect(routeOfPath("/?settings=general,elsewhere")).toBeNull();
  });

  it("returns null for an empty settings parameter", () => {
    expect(routeOfPath("/?settings=")).toBeNull();
  });
});
