// css-tree's type declarations cover only its main entry, which bundles the validation data that sanitizing does not need.
// These declarations give the lighter entries the types of the matching main exports.

declare module "css-tree/parser" {
  import { parse } from "css-tree";
  export default parse;
}

declare module "css-tree/generator" {
  import { generate } from "css-tree";
  export default generate;
}

declare module "css-tree/walker" {
  import { walk } from "css-tree";
  export default walk;
}

declare module "css-tree/utils" {
  export { clone, List } from "css-tree";
}
