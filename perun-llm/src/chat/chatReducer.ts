import type { Conversation, Message } from "../types";

export const DEFAULT_TITLE = "New chat";
const MAX_TITLE_LENGTH = 48;

export interface ChatState {
  conversations: Conversation[];
  activeId: string | null;
  streaming: { conversationId: string; messageId: string } | null;
}

export type ChatAction =
  | { type: "hydrated"; state: ChatState }
  | { type: "conversationCreated"; conversation: Conversation }
  | { type: "conversationOpened"; id: string }
  | { type: "conversationDeleted"; id: string }
  | { type: "userMessageAdded"; conversationId: string; message: Message }
  | { type: "assistantStarted"; conversationId: string; message: Message }
  | { type: "assistantDelta"; conversationId: string; messageId: string; text: string }
  | { type: "assistantFinished" | "assistantStopped"; conversationId: string; messageId: string }
  | { type: "assistantFailed"; conversationId: string; messageId: string; error: string };

export const emptyState: ChatState = {
  conversations: [],
  activeId: null,
  streaming: null,
};

// crypto.randomUUID exists only in secure contexts, and the app is also served
// over plain http on a LAN. crypto.getRandomValues works everywhere.
export function createId(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  bytes[6] = ((bytes[6] ?? 0) & 0x0f) | 0x40;
  bytes[8] = ((bytes[8] ?? 0) & 0x3f) | 0x80;
  const hex = Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

export function deriveTitle(text: string): string {
  const firstLine = text.trim().split("\n")[0] ?? "";
  const title = firstLine.replace(/\s+/g, " ").trim();
  if (!title) return DEFAULT_TITLE;
  if (title.length <= MAX_TITLE_LENGTH) return title;

  const cut = title.slice(0, MAX_TITLE_LENGTH - 1);
  const lastSpace = cut.lastIndexOf(" ");
  return `${(lastSpace > 0 ? cut.slice(0, lastSpace) : cut).trimEnd()}…`;
}

function sortByUpdated(conversations: Conversation[]): Conversation[] {
  return [...conversations].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

function updateMessage(
  state: ChatState,
  conversationId: string,
  messageId: string,
  update: (message: Message) => Message,
): ChatState {
  const conversation = state.conversations.find((c) => c.id === conversationId);
  if (!conversation?.messages.some((m) => m.id === messageId)) return state;
  return {
    ...state,
    conversations: state.conversations.map((c) =>
      c.id === conversationId
        ? { ...c, messages: c.messages.map((m) => (m.id === messageId ? update(m) : m)) }
        : c,
    ),
  };
}

function endStream(state: ChatState, conversationId: string, messageId: string): ChatState {
  const current = state.streaming;
  const isCurrent = current?.conversationId === conversationId && current.messageId === messageId;
  return isCurrent ? { ...state, streaming: null } : state;
}

export function chatReducer(state: ChatState, action: ChatAction): ChatState {
  switch (action.type) {
    case "hydrated":
      return action.state;

    case "conversationCreated":
      return {
        ...state,
        conversations: [action.conversation, ...state.conversations],
        activeId: action.conversation.id,
      };

    case "conversationOpened":
      return state.conversations.some((c) => c.id === action.id)
        ? { ...state, activeId: action.id }
        : state;

    case "conversationDeleted": {
      const conversations = state.conversations.filter((c) => c.id !== action.id);
      return {
        conversations,
        activeId:
          state.activeId === action.id ? (conversations[0]?.id ?? null) : state.activeId,
        streaming: state.streaming?.conversationId === action.id ? null : state.streaming,
      };
    }

    case "userMessageAdded":
      return {
        ...state,
        conversations: sortByUpdated(
          state.conversations.map((c) =>
            c.id === action.conversationId
              ? {
                  ...c,
                  title: c.messages.length === 0 ? deriveTitle(action.message.content) : c.title,
                  updatedAt: action.message.createdAt,
                  messages: [...c.messages, action.message],
                }
              : c,
          ),
        ),
      };

    case "assistantStarted": {
      const conversation = state.conversations.find((c) => c.id === action.conversationId);
      if (!conversation) return state;
      const others = conversation.messages.filter((m) => m.id !== action.message.id);
      return {
        streaming: { conversationId: action.conversationId, messageId: action.message.id },
        activeId: state.activeId,
        conversations: state.conversations.map((c) =>
          c.id === action.conversationId ? { ...c, messages: [...others, action.message] } : c,
        ),
      };
    }

    case "assistantDelta":
      return updateMessage(state, action.conversationId, action.messageId, (m) => ({
        ...m,
        content: m.content + action.text,
      }));

    case "assistantFinished":
      return endStream(
        updateMessage(state, action.conversationId, action.messageId, (m) => ({
          ...m,
          status: "complete",
        })),
        action.conversationId,
        action.messageId,
      );

    case "assistantStopped":
      return endStream(
        updateMessage(state, action.conversationId, action.messageId, (m) => ({
          ...m,
          status: "stopped",
        })),
        action.conversationId,
        action.messageId,
      );

    case "assistantFailed":
      return endStream(
        updateMessage(state, action.conversationId, action.messageId, (m) => ({
          ...m,
          status: "error",
          error: action.error,
        })),
        action.conversationId,
        action.messageId,
      );
  }
}
