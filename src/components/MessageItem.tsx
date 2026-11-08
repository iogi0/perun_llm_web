import type { Message } from "../types";
import { Logo } from "./Logo";
import { Markdown } from "./Markdown";

interface MessageItemProps {
  message: Message;
  onRetry: (messageId: string) => void;
}

export function MessageItem({ message, onRetry }: MessageItemProps) {
  if (message.role === "user") {
    return (
      <div className="flex justify-end">
        <p className="max-w-[85%] rounded-[18px] bg-bubble px-4 py-2.5 text-[16px] leading-[1.65] [overflow-wrap:anywhere] whitespace-pre-wrap">
          {message.content}
        </p>
      </div>
    );
  }

  const waiting = message.status === "streaming" && message.content === "";

  return (
    <div className="grid grid-cols-[28px_minmax(0,1fr)] gap-3">
      <Logo size={28} />
      <div className="min-w-0 text-[16px] leading-[1.65]">
        {message.origin === "mock" && (
          <span className="mb-2 inline-block rounded-[6px] border border-line px-[7px] py-px text-[13px] leading-[1.4] text-ink-muted">
            Demo reply
          </span>
        )}
        {waiting && (
          <div role="status" aria-label="Generating reply" className="typing-dots">
            <span />
            <span />
            <span />
          </div>
        )}
        {message.content !== "" && (
          <div className={`md ${message.status === "streaming" ? "streaming-caret" : ""}`}>
            <Markdown content={message.content} />
          </div>
        )}
        {message.status === "stopped" && (
          <p className="mt-2 text-[13px] text-ink-muted">Stopped</p>
        )}
        {message.status === "error" && (
          <div role="alert" className="mt-1 flex flex-wrap items-center gap-3 text-danger">
            <span>{message.error}</span>
            <button
              type="button"
              onClick={() => onRetry(message.id)}
              className="min-h-11 cursor-pointer rounded-[10px] border border-line bg-surface px-3 text-[15px] text-ink hover:bg-bubble lg:min-h-9 pointer-coarse:min-h-11"
            >
              Retry
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
