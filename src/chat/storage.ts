import type { Conversation, Message } from "../types";
import type { ChatState } from "./chatReducer";

export const STORAGE_KEY = "perun-llm:v1";
export const MAX_CONVERSATIONS = 100;
const SAVE_DELAY_MS = 300;

type ReadableStorage = Pick<Storage, "getItem">;
type WritableStorage = Pick<Storage, "setItem">;

function getStorage(): Storage | null {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isMessage(value: unknown): value is Message {
  if (!isRecord(value)) return false;
  return (
    typeof value.id === "string" &&
    (value.role === "user" || value.role === "assistant") &&
    typeof value.content === "string" &&
    typeof value.createdAt === "string" &&
    (value.status === "complete" ||
      value.status === "streaming" ||
      value.status === "stopped" ||
      value.status === "error") &&
    (value.origin === undefined || value.origin === "mock" || value.origin === "api") &&
    (value.error === undefined || typeof value.error === "string")
  );
}

function isConversation(value: unknown): value is Conversation {
  if (!isRecord(value)) return false;
  return (
    typeof value.id === "string" &&
    typeof value.title === "string" &&
    typeof value.createdAt === "string" &&
    typeof value.updatedAt === "string" &&
    Array.isArray(value.messages) &&
    value.messages.every(isMessage)
  );
}

function newestFirst(conversations: Conversation[]): Conversation[] {
  return [...conversations]
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
    .slice(0, MAX_CONVERSATIONS);
}

function emptyLoadedState(): ChatState {
  return { conversations: [], activeId: null, streaming: null };
}

export function load(
  storage: ReadableStorage | null = getStorage(),
): ChatState {
  try {
    const raw = storage?.getItem(STORAGE_KEY);
    if (!raw) return emptyLoadedState();

    const data: unknown = JSON.parse(raw);
    if (!isRecord(data) || data.version !== 1) return emptyLoadedState();
    if (!Array.isArray(data.conversations) || !data.conversations.every(isConversation)) {
      return emptyLoadedState();
    }

    const conversations = newestFirst(data.conversations as Conversation[]).map((c) => ({
      ...c,
      messages: c.messages.map((m) =>
        m.status === "streaming" ? { ...m, status: "stopped" as const } : m,
      ),
    }));
    const activeId = conversations.some((c) => c.id === data.activeId)
      ? (data.activeId as string)
      : (conversations[0]?.id ?? null);

    return { conversations, activeId, streaming: null };
  } catch {
    return emptyLoadedState();
  }
}

export function save(
  state: ChatState,
  storage: WritableStorage | null = getStorage(),
): boolean {
  if (!storage) return false;
  try {
    storage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        version: 1,
        conversations: newestFirst(state.conversations),
        activeId: state.activeId,
      }),
    );
    return true;
  } catch {
    return false;
  }
}

export interface Saver {
  schedule: (state: ChatState) => void;
  saveNow: (state: ChatState) => void;
  flush: () => void;
  cancel: () => void;
}

export function createSaver(
  write: (state: ChatState) => boolean,
  onResult: (saved: boolean) => void,
): Saver {
  let timer: ReturnType<typeof setTimeout> | null = null;
  let pending: ChatState | null = null;

  function saveNow(state: ChatState) {
    if (timer !== null) clearTimeout(timer);
    timer = null;
    pending = null;
    onResult(write(state));
  }

  return {
    saveNow,
    schedule(state) {
      if (timer !== null) clearTimeout(timer);
      pending = state;
      timer = setTimeout(() => saveNow(state), SAVE_DELAY_MS);
    },
    flush() {
      if (pending) saveNow(pending);
    },
    cancel() {
      if (timer !== null) clearTimeout(timer);
      timer = null;
      pending = null;
    },
  };
}
