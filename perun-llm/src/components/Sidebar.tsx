import { Plus, Trash2 } from "lucide-react";
import { useRef, useState } from "react";
import { useChat } from "../chat/ChatContext";
import { ConfirmDialog } from "./ConfirmDialog";
import { Logo } from "./Logo";

interface SidebarProps {
  onNavigate?: () => void;
}

export function Sidebar({ onNavigate }: SidebarProps) {
  const { state, newChat, openChat, deleteChat } = useChat();
  const [pendingDelete, setPendingDelete] = useState<string | null>(null);
  const newChatRef = useRef<HTMLButtonElement>(null);

  function confirmDelete() {
    if (pendingDelete) deleteChat(pendingDelete);
    setPendingDelete(null);
    requestAnimationFrame(() => newChatRef.current?.focus());
  }

  return (
    <div className="flex h-full min-h-0 flex-col gap-3 bg-sidebar p-3 pt-[max(0.75rem,env(safe-area-inset-top))] pb-[max(0.75rem,env(safe-area-inset-bottom))]">
      <div className="flex h-9 items-center gap-2 px-1.5 font-medium">
        <Logo size={22} />
        Perun LLM
      </div>
      <button
        ref={newChatRef}
        type="button"
        onClick={() => {
          newChat();
          onNavigate?.();
        }}
        className="flex min-h-11 cursor-pointer items-center gap-2 rounded-[10px] border border-line bg-surface px-2.5 hover:bg-bubble lg:min-h-10 pointer-coarse:min-h-11"
      >
        <Plus size={16} aria-hidden="true" />
        New chat
      </button>
      <nav aria-label="Chat history" className="min-h-0 flex-1 overflow-y-auto">
        <ul className="grid gap-0.5">
          {state.conversations.map((conversation) => {
            const active = conversation.id === state.activeId;
            return (
              <li
                key={conversation.id}
                className={`group flex items-center rounded-[8px] focus-within:bg-bubble hover:bg-bubble ${active ? "bg-bubble" : ""}`}
              >
                <button
                  type="button"
                  aria-current={active ? "true" : undefined}
                  onClick={() => {
                    openChat(conversation.id);
                    onNavigate?.();
                  }}
                  className={`min-h-11 min-w-0 flex-1 cursor-pointer truncate rounded-[8px] px-2.5 text-left outline-offset-[-2px] lg:min-h-9 pointer-coarse:min-h-11 ${active ? "font-medium text-accent" : ""}`}
                >
                  {conversation.title}
                </button>
                <button
                  type="button"
                  aria-label="Delete conversation"
                  onClick={() => setPendingDelete(conversation.id)}
                  className="grid size-11 shrink-0 cursor-pointer place-items-center rounded-[8px] text-ink-muted outline-offset-[-2px] hover:text-danger lg:size-9 lg:opacity-0 lg:group-focus-within:opacity-100 lg:group-hover:opacity-100 pointer-coarse:size-11 pointer-coarse:opacity-100"
                >
                  <Trash2 size={15} aria-hidden="true" />
                </button>
              </li>
            );
          })}
        </ul>
      </nav>
      <ConfirmDialog
        open={pendingDelete !== null}
        onCancel={() => setPendingDelete(null)}
        onConfirm={confirmDelete}
      />
    </div>
  );
}
