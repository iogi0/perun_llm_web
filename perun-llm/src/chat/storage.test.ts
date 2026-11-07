import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Conversation, Message } from "../types";
import type { ChatState } from "./chatReducer";
import { createSaver, load, MAX_CONVERSATIONS, save, STORAGE_KEY } from "./storage";

function fakeStorage(initial: string | null = null) {
  let value = initial;
  return {
    getItem: () => value,
    setItem: (_key: string, next: string) => {
      value = next;
    },
    read: () => value,
  };
}

const blocked = {
  getItem: () => {
    throw new Error("blocked");
  },
  setItem: () => {
    throw new Error("quota");
  },
};

function message(overrides: Partial<Message> = {}): Message {
  return { id: "m", role: "user", content: "Hi", createdAt: "2026-01-01T00:00:00.000Z", status: "complete", ...overrides };
}

function conversation(id: string, updatedAt: string, messages: Message[] = [message()]): Conversation {
  return { id, title: "Chat", createdAt: "2026-01-01T00:00:00.000Z", updatedAt, messages };
}

function state(...conversations: Conversation[]): ChatState {
  return { conversations, activeId: conversations[0]?.id ?? null, streaming: null };
}

function persisted(value: unknown): string {
  return JSON.stringify(value);
}

describe("load and save", () => {
  it("round-trips the conversations and active id", () => {
    const storage = fakeStorage();
    const original = state(conversation("a", "2026-01-02T00:00:00.000Z"), conversation("b", "2026-01-01T00:00:00.000Z"));
    expect(save(original, storage)).toBe(true);
    expect(load(storage)).toEqual(original);
  });

  it("writes the documented shape under the v1 key", () => {
    let key = "";
    const storage = { ...fakeStorage(), setItem: (k: string) => { key = k; } };
    save(state(), storage);
    expect(key).toBe("perun-llm:v1");
    expect(STORAGE_KEY).toBe("perun-llm:v1");
  });

  it("does not persist streaming progress state", () => {
    const storage = fakeStorage();
    save({ ...state(conversation("a", "2026-01-01T00:00:00.000Z")), streaming: { conversationId: "a", messageId: "m" } }, storage);
    expect(Object.keys(JSON.parse(storage.read() ?? "{}")).sort()).toEqual(["activeId", "conversations", "version"]);
  });

  it("returns an empty state when nothing is stored", () => {
    expect(load(fakeStorage())).toEqual(state());
  });

  it.each([
    ["invalid JSON", "{nope"],
    ["null", "null"],
    ["an array", "[]"],
    ["an unknown version", persisted({ version: 2, conversations: [], activeId: null })],
    ["conversations that are not an array", persisted({ version: 1, conversations: "x", activeId: null })],
    ["a conversation without an id", persisted({ version: 1, conversations: [{ title: "x" }], activeId: null })],
    ["a message with an unknown role", persisted({ version: 1, conversations: [conversation("a", "t", [message({ role: "system" as "user" })])], activeId: "a" })],
    ["a message with an unknown status", persisted({ version: 1, conversations: [conversation("a", "t", [message({ status: "odd" as "complete" })])], activeId: "a" })],
    ["a message with non-string content", persisted({ version: 1, conversations: [conversation("a", "t", [message({ content: 5 as unknown as string })])], activeId: "a" })],
    ["a message with an unknown origin", persisted({ version: 1, conversations: [conversation("a", "t", [message({ origin: "x" as "mock" })])], activeId: "a" })],
  ])("returns an empty state for %s", (_name, raw) => {
    expect(load(fakeStorage(raw))).toEqual(state());
  });

  it("returns an empty state when reading is blocked", () => {
    expect(load(blocked)).toEqual(state());
  });

  it("returns an empty state when storage is unavailable", () => {
    expect(load(null)).toEqual(state());
  });

  it("reports failure when writing is blocked, without throwing", () => {
    expect(save(state(), blocked)).toBe(false);
    expect(save(state(), null)).toBe(false);
  });

  it("loads messages still marked streaming as stopped", () => {
    const raw = persisted({
      version: 1,
      conversations: [conversation("a", "2026-01-01T00:00:00.000Z", [message({ role: "assistant", status: "streaming", origin: "mock" })])],
      activeId: "a",
    });
    expect(load(fakeStorage(raw)).conversations[0]?.messages[0]?.status).toBe("stopped");
  });

  it("opens the newest conversation when the stored active id is unknown", () => {
    const raw = persisted({
      version: 1,
      conversations: [conversation("old", "2026-01-01T00:00:00.000Z"), conversation("new", "2026-01-03T00:00:00.000Z")],
      activeId: "missing",
    });
    const loaded = load(fakeStorage(raw));
    expect(loaded.conversations.map((c) => c.id)).toEqual(["new", "old"]);
    expect(loaded.activeId).toBe("new");
  });

  function many(count: number): Conversation[] {
    return Array.from({ length: count }, (_, index) =>
      conversation(`c${index}`, new Date(Date.UTC(2026, 0, 1, 0, index)).toISOString()),
    ).reverse();
  }

  it("keeps at most 100 conversations when saving, dropping the oldest", () => {
    const storage = fakeStorage();
    save(state(...many(MAX_CONVERSATIONS + 5)), storage);
    const loaded = load(storage);
    expect(loaded.conversations).toHaveLength(100);
    expect(loaded.conversations.some((c) => c.id === "c0")).toBe(false);
    expect(loaded.conversations[0]?.id).toBe("c104");
  });

  it("keeps at most 100 conversations when loading", () => {
    const raw = persisted({ version: 1, conversations: many(101), activeId: null });
    expect(load(fakeStorage(raw)).conversations).toHaveLength(100);
  });

  it("clears an active id that the cap dropped when saving", () => {
    const storage = fakeStorage();
    const conversations = many(101);
    save({ conversations, activeId: "c0", streaming: null }, storage);
    expect(load(storage).activeId).toBe("c100");
  });
});

describe("createSaver", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it("waits 300 ms and saves only the latest state", () => {
    const write = vi.fn(() => true);
    const saver = createSaver(write, vi.fn());
    saver.schedule(state());
    const latest = state(conversation("a", "t"));
    saver.schedule(latest);
    vi.advanceTimersByTime(299);
    expect(write).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1);
    expect(write).toHaveBeenCalledTimes(1);
    expect(write).toHaveBeenCalledWith(latest);
  });

  it("saves immediately on demand and cancels the pending save", () => {
    const write = vi.fn(() => true);
    const saver = createSaver(write, vi.fn());
    saver.schedule(state());
    const latest = state(conversation("a", "t"));
    saver.saveNow(latest);
    vi.advanceTimersByTime(1000);
    expect(write).toHaveBeenCalledTimes(1);
    expect(write).toHaveBeenCalledWith(latest);
  });

  it("flush writes a pending save and does nothing otherwise", () => {
    const write = vi.fn(() => true);
    const saver = createSaver(write, vi.fn());
    saver.flush();
    expect(write).not.toHaveBeenCalled();
    saver.schedule(state());
    saver.flush();
    expect(write).toHaveBeenCalledTimes(1);
  });

  it("cancel drops a pending save", () => {
    const write = vi.fn(() => true);
    const saver = createSaver(write, vi.fn());
    saver.schedule(state());
    saver.cancel();
    vi.advanceTimersByTime(1000);
    saver.flush();
    expect(write).not.toHaveBeenCalled();
  });

  it("reports the result of each write", () => {
    const onResult = vi.fn();
    const saver = createSaver(() => false, onResult);
    saver.saveNow(state());
    expect(onResult).toHaveBeenCalledWith(false);
  });
});
