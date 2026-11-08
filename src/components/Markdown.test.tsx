import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { Markdown } from "./Markdown";

function html(markdown: string): string {
  return renderToStaticMarkup(<Markdown content={markdown} />);
}

describe("Markdown rendering", () => {
  it("renders headings", () => {
    expect(html("## Results")).toContain("<h2>Results</h2>");
  });

  it("renders bullet and numbered lists", () => {
    const out = html("- one\n- two\n\n1. first");
    expect(out).toMatch(/<ul>[\s\S]*<li>one<\/li>[\s\S]*<li>two<\/li>[\s\S]*<\/ul>/);
    expect(out).toMatch(/<ol>[\s\S]*<li>first<\/li>/);
  });

  it("renders GFM tables inside their own scrolling container", () => {
    const out = html("| a | b |\n|---|---|\n| 1 | 2 |");
    expect(out).toMatch(/<div class="[^"]*overflow-x-auto[^"]*"[^>]*><table>/);
    expect(out).toContain("<td>1</td>");
  });

  it("renders inline code as code without a code block", () => {
    const out = html("Use `npm test` now");
    expect(out).toContain("<code>npm test</code>");
    expect(out).not.toContain("<pre");
  });

  it("renders a fenced block with its language label and highlighting", () => {
    const out = html('```python\nprint("hi")\n```');
    expect(out).toContain(">python<");
    expect(out).toContain('aria-label="Copy code"');
    expect(out).toMatch(/<pre[^>]*><code class="hljs language-python">/);
    expect(out).toContain('class="hljs-string"');
  });

  it("labels a fenced block without a language as text", () => {
    expect(html("```\nplain\n```")).toContain(">text<");
  });
});

describe("Markdown safety", () => {
  it("renders a script tag as text", () => {
    const out = html('<script>alert("x")</script>');
    expect(out).not.toContain("<script");
    expect(out).toContain("&lt;script&gt;");
  });

  it("renders an img with onerror as text", () => {
    const out = html('<img src=x onerror="alert(1)">');
    expect(out).not.toContain("<img");
    expect(out).toContain("&lt;img");
  });

  it("removes the href of a javascript: link", () => {
    const out = html("[click](javascript:alert(1))");
    expect(out).not.toContain("javascript:");
    expect(out).not.toMatch(/href=/);
    expect(out).toContain("click");
  });

  it("removes the href of a data: link", () => {
    expect(html("[x](data:text/html;base64,PHNjcmlwdD4=)")).not.toMatch(/href=/);
  });

  it("opens safe links in a new tab without an opener", () => {
    const out = html("[docs](https://example.com)");
    expect(out).toContain('href="https://example.com"');
    expect(out).toContain('target="_blank"');
    expect(out).toContain('rel="noopener noreferrer"');
  });

  it("renders a Markdown image as text, never as an img element", () => {
    const out = html("![tracking pixel](https://tracker.example/p.gif)");
    expect(out).not.toContain("<img");
    expect(out).not.toContain("tracker.example");
    expect(out).toContain("tracking pixel");
  });
});
