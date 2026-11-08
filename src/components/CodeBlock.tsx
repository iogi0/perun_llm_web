import { Check, Copy } from "lucide-react";
import { isValidElement, useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import { copyText } from "./copyText";

const COPIED_MS = 2000;

function languageOf(children: ReactNode): string {
  if (!isValidElement(children)) return "text";
  const { className } = children.props as { className?: unknown };
  if (typeof className !== "string") return "text";
  return /language-(\S+)/.exec(className)?.[1] ?? "text";
}

function selectContents(element: HTMLElement) {
  element.focus();
  const range = document.createRange();
  range.selectNodeContents(element);
  const selection = window.getSelection();
  selection?.removeAllRanges();
  selection?.addRange(range);
}

export function CodeBlock({ children }: { children: ReactNode }) {
  const preRef = useRef<HTMLPreElement>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const [copyState, setCopyState] = useState<"idle" | "copied" | "manual">("idle");

  useEffect(() => () => clearTimeout(timerRef.current), []);

  async function handleCopy() {
    const pre = preRef.current;
    if (!pre) return;
    clearTimeout(timerRef.current);
    if (await copyText(pre.textContent ?? "", navigator.clipboard)) {
      setCopyState("copied");
      timerRef.current = setTimeout(() => setCopyState("idle"), COPIED_MS);
    } else {
      selectContents(pre);
      setCopyState("manual");
    }
  }

  const status = {
    idle: "",
    copied: "Copied",
    manual: "Press Ctrl+C to copy",
  }[copyState];

  return (
    <div className="my-3 overflow-hidden rounded-[10px] border border-line">
      <div className="flex min-h-10 items-center justify-between gap-2 border-b border-line bg-surface pr-1.5 pl-3 text-[13px] text-ink-muted">
        <span className="min-w-0 truncate">{languageOf(children)}</span>
        <span className="flex items-center gap-2">
          {copyState === "manual" && <span>{status}</span>}
          <button
            type="button"
            aria-label="Copy code"
            onClick={() => void handleCopy()}
            className="flex min-h-11 cursor-pointer items-center gap-1.5 rounded-[8px] px-2 hover:bg-bubble hover:text-ink lg:min-h-8 pointer-coarse:min-h-11"
          >
            {copyState === "copied" ? (
              <Check size={14} aria-hidden="true" />
            ) : (
              <Copy size={14} aria-hidden="true" />
            )}
            <span aria-hidden="true">{copyState === "copied" ? "Copied" : "Copy"}</span>
          </button>
        </span>
        <span aria-live="polite" className="sr-only">
          {status}
        </span>
      </div>
      <pre
        ref={preRef}
        tabIndex={0}
        className="overflow-x-auto bg-code p-3 font-mono text-[14px] leading-[1.55] outline-offset-[-2px]"
      >
        {children}
      </pre>
    </div>
  );
}
