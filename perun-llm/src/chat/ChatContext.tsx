import { createContext, useContext, useEffect, useReducer, useRef } from "react";
import type { Dispatch, ReactNode } from "react";
import { getChatApi } from "../api/chatApi";
import type { Conversation, Message } from "../types";
import { chatReducer, createId, DEFAULT_TITLE, emptyState } from "./chatReducer";
import type { ChatAction, ChatState } from "./chatReducer";

interface ChatContextValue {
  state: ChatState;
  newChat: () => void;
  openChat: (id: string) => void;
  deleteChat: (id: string) => void;
  send: (text: string) => void;
  stop: () => void;
  retry: (messageId: string) => void;
}

const ChatContext = createContext<ChatContextValue | null>(null);
const api = getChatApi();

function createConversation(): Conversation {
  const now = new Date().toISOString();
  return { id: createId(), title: DEFAULT_TITLE, createdAt: now, updatedAt: now, messages: [] };
}

function toHistory(messages: Message[]) {
  return messages
    .filter((message) => message.status !== "error" && message.content !== "")
    .map(({ role, content }) => ({ role, content }));
}

async function pumpReply(
  conversationId: string,
  messageId: string,
  history: Message[],
  signal: AbortSignal,
  dispatch: Dispatch<ChatAction>,
): Promise<void> {
  const ids = { conversationId, messageId };
  const fail = (error: string) => dispatch({ type: "assistantFailed", ...ids, error });
  try {
    const request = { conversationId, messages: toHistory(history) };
    for await (const event of api.streamReply(request, signal)) {
      if (signal.aborted) return;
      if (event.type === "delta") {
        dispatch({ type: "assistantDelta", ...ids, text: event.text });
      } else if (event.type === "done") {
        dispatch({ type: "assistantFinished", ...ids });
        return;
      } else {
        fail(event.message);
        return;
      }
    }
    if (!signal.aborted) fail("The reply ended early. Try again.");
  } catch {
    if (!signal.aborted) fail("The reply could not be completed. Try again.");
  }
}

export function ChatProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(chatReducer, emptyState);
  const controllerRef = useRef<AbortController | null>(null);

  useEffect(() => () => controllerRef.current?.abort(), []);

  function startReply(conversationId: string, history: Message[], messageId: string) {
    const controller = new AbortController();
    controllerRef.current = controller;
    dispatch({
      type: "assistantStarted",
      conversationId,
      message: {
        id: messageId,
        role: "assistant",
        content: "",
        createdAt: new Date().toISOString(),
        status: "streaming",
        origin: api.origin,
      },
    });
    void pumpReply(conversationId, messageId, history, controller.signal, dispatch);
  }

  function newChat() {
    const reusable = state.conversations.find((c) => c.messages.length === 0);
    if (reusable) {
      dispatch({ type: "conversationOpened", id: reusable.id });
    } else {
      dispatch({ type: "conversationCreated", conversation: createConversation() });
    }
  }

  function deleteChat(id: string) {
    if (state.streaming?.conversationId === id) controllerRef.current?.abort();
    dispatch({ type: "conversationDeleted", id });
  }

  function send(text: string) {
    const content = text.trim();
    if (!content || state.streaming) return;

    let conversation = state.conversations.find((c) => c.id === state.activeId);
    if (!conversation) {
      conversation = createConversation();
      dispatch({ type: "conversationCreated", conversation });
    }
    const message: Message = {
      id: createId(),
      role: "user",
      content,
      createdAt: new Date().toISOString(),
      status: "complete",
    };
    dispatch({ type: "userMessageAdded", conversationId: conversation.id, message });
    startReply(conversation.id, [...conversation.messages, message], createId());
  }

  function stop() {
    if (!state.streaming) return;
    controllerRef.current?.abort();
    dispatch({ type: "assistantStopped", ...state.streaming });
  }

  function retry(messageId: string) {
    if (state.streaming) return;
    for (const conversation of state.conversations) {
      const index = conversation.messages.findIndex((m) => m.id === messageId);
      if (index >= 0) {
        startReply(conversation.id, conversation.messages.slice(0, index), messageId);
        return;
      }
    }
  }

  const value: ChatContextValue = {
    state,
    newChat,
    openChat: (id) => dispatch({ type: "conversationOpened", id }),
    deleteChat,
    send,
    stop,
    retry,
  };

  return <ChatContext.Provider value={value}>{children}</ChatContext.Provider>;
}

export function useChat(): ChatContextValue {
  const value = useContext(ChatContext);
  if (!value) throw new Error("useChat must be used inside ChatProvider.");
  return value;
}
