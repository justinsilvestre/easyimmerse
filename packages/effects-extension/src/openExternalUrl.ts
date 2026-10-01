/** The subset of the extension's `tabs.create` API that opening a URL needs. */
export type CreateTab = (properties: { url: string }) => Promise<unknown>;

/** Builds the effect that opens a URL in a new browser tab through the extension's tabs API. */
export function createOpenExternalUrl(createTab: CreateTab) {
  return (url: string): void => {
    void createTab({ url });
  };
}
