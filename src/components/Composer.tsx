import { ArrowUp, Square } from "lucide-react";
import { useLayoutEffect, useRef, useState } from "react";
import type { KeyboardEvent } from "react";
import {
  canSend,
  COUNTER_THRESHOLD,
  enterAction,
  MAX_MESSAGE_LENGTH,
} from "./composerKeys";

const MAX_TEXTAREA_HEIGHT = 8 * 24 + 14;

function hasCoarsePointer(): boolean {
  return window.matchMedia("(pointer: coarse)").matches;
}

interface ComposerProps {
  streaming: boolean;
  onSend: (text: string) => void;
  onStop: () => void;
}

export function Composer({ streaming, onSend, onStop }: ComposerProps) {
  const [text, setText] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const sendable = canSend(text, streaming);

  useLayoutEffect(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    textarea.style.height = "auto";
    textarea.style.height = `${Math.min(textarea.scrollHeight, MAX_TEXTAREA_HEIGHT)}px`;
  }, [text]);

  function submit() {
    if (!sendable) return;
    onSend(text.trim());
    setText("");
    if (!hasCoarsePointer()) textareaRef.current?.focus();
  }

  function handleKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    const action = enterAction(
      {
        key: event.key,
        shiftKey: event.shiftKey,
        isComposing: event.nativeEvent.isComposing,
        keyCode: event.keyCode,
      },
      hasCoarsePointer(),
    );
    if (action !== "send") return;
    event.preventDefault();
    submit();
  }

  const overLimit = text.length > MAX_MESSAGE_LENGTH;
  const buttonClass =
    "grid size-11 shrink-0 cursor-pointer place-items-center rounded-[10px] lg:size-9 pointer-coarse:size-11";

  return (
    <div className="rounded-[16px] border border-line bg-surface p-2 pl-4 shadow-[var(--composer-shadow)] focus-within:border-accent focus-within:shadow-[0_0_0_1px_var(--accent),var(--composer-shadow)]">
      {text.length > COUNTER_THRESHOLD && (
        <p
          className={`pb-1 text-right text-[13px] ${overLimit ? "text-danger" : "text-ink-muted"}`}
        >
          {text.length.toLocaleString("en-US")} /{" "}
          {MAX_MESSAGE_LENGTH.toLocaleString("en-US")}
        </p>
      )}
      <div className="flex items-end gap-2">
        <textarea
          ref={textareaRef}
          value={text}
          rows={1}
          aria-label="Message Perun LLM"
          placeholder="Message Perun LLM…"
          onChange={(event) => setText(event.target.value)}
          onKeyDown={handleKeyDown}
          className="min-w-0 flex-1 resize-none self-center bg-transparent py-[7px] text-[16px] leading-6 outline-none placeholder:text-ink-muted"
        />
        {streaming ? (
          <button
            type="button"
            aria-label="Stop generating"
            onClick={onStop}
            className={`${buttonClass} bg-accent text-canvas`}
          >
            <Square size={14} fill="currentColor" aria-hidden="true" />
          </button>
        ) : (
          <button
            type="button"
            aria-label="Send message"
            disabled={!sendable}
            onClick={submit}
            className={`${buttonClass} bg-accent text-canvas disabled:cursor-default disabled:bg-bubble disabled:text-ink-muted`}
          >
            <ArrowUp size={18} aria-hidden="true" />
          </button>
        )}
      </div>
    </div>
  );
}
