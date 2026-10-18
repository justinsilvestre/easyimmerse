import { describe, expectTypeOf, it } from "vitest";
import type { FeatureActionCreators } from "./appAction.ts";

type ActionTypesOf<C> =
  C extends Record<string, (...args: never[]) => { type: string }>
    ? ReturnType<C[keyof C]>["type"]
    : never;

type SharedActionTypes<T extends readonly unknown[]> = T extends readonly [
  infer Head,
  ...infer Rest,
]
  ?
      | Extract<ActionTypesOf<Head>, ActionTypesOf<Rest[number]>>
      | SharedActionTypes<Rest>
  : never;

describe("the feature action creators", () => {
  it("declare no action type twice", () => {
    expectTypeOf<SharedActionTypes<FeatureActionCreators>>().toBeNever();
  });
});
