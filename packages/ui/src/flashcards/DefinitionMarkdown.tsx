import clsx from "clsx";
import { gfmStrikethroughFromMarkdown } from "mdast-util-gfm-strikethrough";
import { gfmTableFromMarkdown } from "mdast-util-gfm-table";
import { gfmStrikethrough } from "micromark-extension-gfm-strikethrough";
import { gfmTable } from "micromark-extension-gfm-table";
import Markdown, {
  type AllowElement,
  type Components,
  defaultUrlTransform,
  type Options,
} from "react-markdown";

/**
 * Shows a definition's Markdown as the exported Anki card renders it: CommonMark with tables and strikethrough,
 * a definition of a single paragraph left unwrapped, HTML shown as text, and links only to web pages and email addresses.
 */
export function DefinitionMarkdown({
  markdown,
  className,
}: {
  markdown: string;
  className?: string;
}) {
  return (
    <div
      className={clsx(
        "[&_ol]:list-decimal [&_ol]:pl-5 [&_ul]:list-disc [&_ul]:pl-5 [&_p+p]:mt-1 [&_td]:border [&_td]:border-line [&_td]:px-1 [&_th]:border [&_th]:border-line [&_th]:px-1",
        className,
      )}
    >
      <Markdown
        remarkPlugins={[remarkTablesAndStrikethrough]}
        allowElement={isNotLoneParagraph}
        unwrapDisallowed
        urlTransform={ankiUrl}
        components={components}
      >
        {markdown}
      </Markdown>
    </div>
  );
}

/** Adds the two extensions to CommonMark that the Anki export renders, leaving out the rest of GitHub's, such as links made from bare addresses. */
const remarkTablesAndStrikethrough: RemarkPlugin = function () {
  // remark-parse reads these fields of the processor's data; its type declarations for them are not a dependency here.
  const processorData = this.data();
  const data = processorData as typeof processorData & ParserExtensions;
  data.micromarkExtensions = [
    ...(data.micromarkExtensions ?? []),
    gfmTable(),
    gfmStrikethrough(),
  ];
  data.fromMarkdownExtensions = [
    ...(data.fromMarkdownExtensions ?? []),
    gfmTableFromMarkdown(),
    gfmStrikethroughFromMarkdown(),
  ];
};

type ParserExtensions = {
  micromarkExtensions?: unknown[];
  fromMarkdownExtensions?: unknown[];
};

type RemarkPlugin = Extract<
  NonNullable<Options["remarkPlugins"]>[number],
  (...parameters: never[]) => unknown
>;

const isNotLoneParagraph: AllowElement = (element, _index, parent) =>
  !(
    element.tagName === "p" &&
    parent?.type === "root" &&
    parent.children.filter(
      (child) => !(child.type === "text" && child.value.trim() === ""),
    ).length === 1
  );

/** Keeps a URL that react-markdown deems safe when it leads to a web page or an email address, and drops any other. */
function ankiUrl(url: string) {
  const safe = defaultUrlTransform(url);
  return /^(https?|mailto):/i.test(safe) ? safe : "";
}

const components: Components = {
  a: ({ href, children }) =>
    href ? (
      <a
        href={href}
        target="_blank"
        rel="noreferrer"
        className="text-accent-fg underline"
      >
        {children}
      </a>
    ) : (
      children
    ),
  img: ({ src, alt }) => (src ? <img src={src} alt={alt} /> : alt),
};
