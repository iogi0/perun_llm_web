import ReactMarkdown from "react-markdown";
import type { Components } from "react-markdown";
import rehypeHighlight from "rehype-highlight";
import remarkGfm from "remark-gfm";
import { CodeBlock } from "./CodeBlock";

// Raw HTML is never passed through: without rehype-raw, react-markdown renders
// it as text. Keep its default urlTransform, which drops javascript: and data:
// URLs.
const components: Components = {
  pre: ({ children }) => <CodeBlock>{children}</CodeBlock>,
  a: ({ href, children }) =>
    href ? (
      <a href={href} target="_blank" rel="noopener noreferrer">
        {children}
      </a>
    ) : (
      <span>{children}</span>
    ),
  img: ({ alt }) => (
    <span className="text-ink-muted">[Image: {alt || "no description"}]</span>
  ),
  table: ({ children }) => (
    <div className="my-3 overflow-x-auto" tabIndex={0}>
      <table>{children}</table>
    </div>
  ),
};

const rehypePlugins = [rehypeHighlight];
const remarkPlugins = [remarkGfm];

export function Markdown({ content }: { content: string }) {
  return (
    <ReactMarkdown
      remarkPlugins={remarkPlugins}
      rehypePlugins={rehypePlugins}
      components={components}
    >
      {content}
    </ReactMarkdown>
  );
}
