/**
 * Parses dictionary markup into the nodes of a detached document, in which no script runs and no resource loads.
 * XML is tried first, so that XDXF elements such as `<tr>` keep their place; markup that is not well-formed XML is parsed as HTML.
 */
export function parseMarkup(markup: string, syntax: "html" | "xml"): Node[] {
  const parser = new DOMParser();
  if (syntax === "xml") {
    const document = parser.parseFromString(
      `<markup>${markup}</markup>`,
      "application/xml",
    );
    if (document.getElementsByTagName("parsererror").length === 0)
      return [...document.documentElement.childNodes];
  }
  return [...parser.parseFromString(markup, "text/html").body.childNodes];
}
