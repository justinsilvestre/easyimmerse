/** The action creators of the library screen's filter. */
export const libraryBrowseActions = {
  /** The user turned a tag's chip on or off. */
  libraryTagToggled: (tag: string) =>
    ({ type: "libraryTagToggled", tag }) as const,
};

/** An action of the library screen's filter. */
export type LibraryBrowseAction = ReturnType<
  (typeof libraryBrowseActions)[keyof typeof libraryBrowseActions]
>;
