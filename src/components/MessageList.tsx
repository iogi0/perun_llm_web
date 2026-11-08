import { useLayoutEffect, useRef } from "react";
import type { Message } from "../types";
import { MessageItem } from "./MessageItem";

const STICK_DISTANCE = 120;

interface MessageListProps {
  messages: Message[];
  onRetry: (messageId: string) => void;
}

export function MessageList({ messages, onRetry }: MessageListProps) {
  const scrollerRef = useRef<HTMLDivElement>(null);
  const stickRef = useRef(true);
  const last = messages.at(-1);

  useLayoutEffect(() => {
    const scroller = scrollerRef.current;
    if (scroller && stickRef.current) scroller.scrollTop = scroller.scrollHeight;
  }, [messages.length, last?.content, last?.status]);

  function handleScroll() {
    const scroller = scrollerRef.current;
    if (!scroller) return;
    const distance = scroller.scrollHeight - scroller.scrollTop - scroller.clientHeight;
    stickRef.current = distance <= STICK_DISTANCE;
  }

  return (
    <div
      ref={scrollerRef}
      role="log"
      aria-label="Messages"
      tabIndex={0}
      onScroll={handleScroll}
      className="min-h-0 flex-1 overflow-x-hidden overflow-y-auto px-4 py-6 outline-offset-[-2px] md:px-6"
    >
      <div className="mx-auto grid w-full max-w-[46rem] gap-6">
        {messages.map((message) => (
          <MessageItem key={message.id} message={message} onRetry={onRetry} />
        ))}
      </div>
    </div>
  );
}
