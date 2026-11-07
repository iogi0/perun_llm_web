import { describe, expect, it } from "vitest";
import type { Conversation, Message } from "../types";
import { chatReducer, createId, deriveTitle, emptyState } from "./chatReducer";
import type { ChatState } from "./chatReducer";

const t0 = "2026-01-01T00:00:00.000Z";
const t1 = "2026-01-01T00:01:00.000Z";

function conversation(id: string, updatedAt = t0, messages: Message[] = []): Conversation {
  return { id, title: "New chat", createdAt: t0, updatedAt, messages };
}

function message(id: string, overrides: Partial<Message> = {}): Message {
  return { id, role: "assistant", content: "", createdAt: t1, status: "streaming", origin: "mock", ...overrides };
}

function stateWith(...conversations: Conversation[]): ChatState {
  return { conversations, activeId: conversations[0]?.id ?? null, streaming: null };
}

function streamingState(): ChatState {
  return {
    conversations: [conversation("a", t0, [message("m")]), conversation("b")],
    activeId: "a",
    streaming: { conversationId: "a", messageId: "m" },
  };
}

describe("deriveTitle", () => {
  it("returns New chat for empty text", () => {
    expect(deriveTitle("  \n ")).toBe("New chat");
  });

  it("uses the first line with whitespace collapsed", () => {
    expect(deriveTitle("  hello   big\tworld \nsecond line")).toBe("hello big world");
  });

  it("keeps a title of exactly 48 characters", () => {
    expect(deriveTitle("a".repeat(48))).toBe("a".repeat(48));
  });

  it("cuts long text at a word boundary with an ellipsis", () => {
    const title = deriveTitle("word ".repeat(20));
    expect(title).toBe(`${"word ".repeat(9).trim()}…`);
    expect(title.length).toBeLessThanOrEqual(48);
  });

  it("hard-cuts a single long word within 48 characters", () => {
    const title = deriveTitle("x".repeat(100));
    expect(title).toBe(`${"x".repeat(47)}…`);
  });
});

describe("createId", () => {
  it("returns distinct ids without crypto.randomUUID, as on a plain-http LAN address", () => {
    const original = crypto.randomUUID;
    Object.defineProperty(crypto, "randomUUID", { value: undefined, configurable: true });
    try {
      const first = createId();
      expect(first).toMatch(/^[0-9a-f-]{36}$/);
      expect(createId()).not.toBe(first);
    } finally {
      Object.defineProperty(crypto, "randomUUID", { value: original, configurable: true });
    }
  });
});

describe("chatReducer", () => {
  it("hydrated replaces the state", () => {
    const next = stateWith(conversation("a"));
    expect(chatReducer(emptyState, { type: "hydrated", state: next })).toBe(next);
  });

  it("conversationCreated adds the conversation first and opens it", () => {
    const next = chatReducer(stateWith(conversation("a")), {
      type: "conversationCreated",
      conversation: conversation("b", t1),
    });
    expect(next.conversations.map((c) => c.id)).toEqual(["b", "a"]);
    expect(next.activeId).toBe("b");
  });

  it("conversationOpened changes the active conversation", () => {
    const next = chatReducer(stateWith(conversation("a"), conversation("b")), {
      type: "conversationOpened",
      id: "b",
    });
    expect(next.activeId).toBe("b");
  });

  it("conversationOpened ignores an unknown id", () => {
    const state = stateWith(conversation("a"));
    expect(chatReducer(state, { type: "conversationOpened", id: "x" })).toBe(state);
  });

  it("deleting the active conversation opens the next one", () => {
    const next = chatReducer(stateWith(conversation("a"), conversation("b")), {
      type: "conversationDeleted",
      id: "a",
    });
    expect(next.conversations.map((c) => c.id)).toEqual(["b"]);
    expect(next.activeId).toBe("b");
  });

  it("deleting another conversation keeps the active one", () => {
    const next = chatReducer(stateWith(conversation("a"), conversation("b")), {
      type: "conversationDeleted",
      id: "b",
    });
    expect(next.activeId).toBe("a");
  });

  it("deleting the last conversation leaves no active conversation", () => {
    const next = chatReducer(stateWith(conversation("a")), { type: "conversationDeleted", id: "a" });
    expect(next.activeId).toBeNull();
  });

  it("deleting the streaming conversation clears streaming", () => {
    const next = chatReducer(streamingState(), { type: "conversationDeleted", id: "a" });
    expect(next.streaming).toBeNull();
  });

  it("deleting another conversation keeps streaming", () => {
    const next = chatReducer(streamingState(), { type: "conversationDeleted", id: "b" });
    expect(next.streaming).toEqual({ conversationId: "a", messageId: "m" });
  });

  it("the first user message sets the title and moves the conversation to the top", () => {
    const next = chatReducer(stateWith(conversation("a", t1), conversation("b", t0)), {
      type: "userMessageAdded",
      conversationId: "b",
      message: message("u", { role: "user", content: "Hello there", status: "complete", createdAt: "2026-01-02T00:00:00.000Z" }),
    });
    expect(next.conversations.map((c) => c.id)).toEqual(["b", "a"]);
    expect(next.conversations[0]?.title).toBe("Hello there");
    expect(next.conversations[0]?.updatedAt).toBe("2026-01-02T00:00:00.000Z");
  });

  it("a later user message keeps the title", () => {
    const start = conversation("a", t0, [message("u", { role: "user", content: "First", status: "complete" })]);
    const next = chatReducer(stateWith({ ...start, title: "First" }), {
      type: "userMessageAdded",
      conversationId: "a",
      message: message("v", { role: "user", content: "Second", status: "complete" }),
    });
    expect(next.conversations[0]?.title).toBe("First");
    expect(next.conversations[0]?.messages).toHaveLength(2);
  });

  it("assistantStarted appends the message and records the stream", () => {
    const next = chatReducer(stateWith(conversation("a")), {
      type: "assistantStarted",
      conversationId: "a",
      message: message("m"),
    });
    expect(next.conversations[0]?.messages[0]?.id).toBe("m");
    expect(next.streaming).toEqual({ conversationId: "a", messageId: "m" });
  });

  it("assistantStarted replaces a message with the same id, for retry", () => {
    const failed = message("m", { status: "error", error: "Failed" });
    const next = chatReducer(stateWith(conversation("a", t0, [failed])), {
      type: "assistantStarted",
      conversationId: "a",
      message: message("m"),
    });
    expect(next.conversations[0]?.messages).toHaveLength(1);
    expect(next.conversations[0]?.messages[0]?.status).toBe("streaming");
    expect(next.conversations[0]?.messages[0]?.error).toBeUndefined();
  });

  it("retrying an earlier failed reply keeps it in its original position", () => {
    const messages = [
      message("u1", { role: "user", status: "complete" }),
      message("a1", { status: "error", error: "Failed" }),
      message("u2", { role: "user", status: "complete" }),
      message("a2", { status: "complete" }),
    ];
    const next = chatReducer(stateWith(conversation("a", t0, messages)), {
      type: "assistantStarted",
      conversationId: "a",
      message: message("a1"),
    });
    expect(next.conversations[0]?.messages.map((m) => m.id)).toEqual(["u1", "a1", "u2", "a2"]);
  });

  it("assistantDelta appends text to its own conversation after the user switches away", () => {
    const switched = chatReducer(streamingState(), { type: "conversationOpened", id: "b" });
    const next = chatReducer(switched, { type: "assistantDelta", conversationId: "a", messageId: "m", text: "Hi" });
    expect(next.conversations.find((c) => c.id === "a")?.messages[0]?.content).toBe("Hi");
    expect(next.conversations.find((c) => c.id === "b")?.messages).toEqual([]);
    expect(next.activeId).toBe("b");
  });

  it("a delta for a deleted conversation changes nothing", () => {
    const deleted = chatReducer(streamingState(), { type: "conversationDeleted", id: "a" });
    expect(
      chatReducer(deleted, { type: "assistantDelta", conversationId: "a", messageId: "m", text: "late" }),
    ).toBe(deleted);
  });

  it("does not route by message id alone", () => {
    const state = streamingState();
    expect(
      chatReducer(state, { type: "assistantDelta", conversationId: "b", messageId: "m", text: "x" }),
    ).toBe(state);
  });

  it.each([
    ["assistantFinished", "complete"],
    ["assistantStopped", "stopped"],
  ] as const)("%s sets status %s and clears streaming", (type, status) => {
    const next = chatReducer(streamingState(), { type, conversationId: "a", messageId: "m" });
    expect(next.conversations[0]?.messages[0]?.status).toBe(status);
    expect(next.streaming).toBeNull();
  });

  it("assistantFailed records the error and clears streaming", () => {
    const next = chatReducer(streamingState(), {
      type: "assistantFailed",
      conversationId: "a",
      messageId: "m",
      error: "Failed",
    });
    expect(next.conversations[0]?.messages[0]).toMatchObject({ status: "error", error: "Failed" });
    expect(next.streaming).toBeNull();
  });

  it("a stale finish leaves a newer stream running", () => {
    const state: ChatState = { ...streamingState(), streaming: { conversationId: "a", messageId: "newer" } };
    const next = chatReducer(state, { type: "assistantFinished", conversationId: "a", messageId: "m" });
    expect(next.streaming).toEqual({ conversationId: "a", messageId: "newer" });
  });

  it("does not mutate the previous state", () => {
    const state = streamingState();
    const snapshot = structuredClone(state);
    chatReducer(state, { type: "assistantDelta", conversationId: "a", messageId: "m", text: "x" });
    expect(state).toEqual(snapshot);
  });
});
