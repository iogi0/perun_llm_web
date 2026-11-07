import { describe, expect, it } from "vitest";
import type { ChatRequest, ChatStreamEvent } from "../types";
import { createMockChatApi, mockChatApi } from "./mockChatApi";

function request(content: string): ChatRequest {
  return { conversationId: "c", messages: [{ role: "user", content }] };
}

const fast = createMockChatApi({ initialDelayMs: 0, chunkDelayMs: 0 });

async function collect(
  iterable: AsyncIterable<ChatStreamEvent>,
  onEvent?: (event: ChatStreamEvent) => void,
): Promise<ChatStreamEvent[]> {
  const events: ChatStreamEvent[] = [];
  for await (const event of iterable) {
    events.push(event);
    onEvent?.(event);
  }
  return events;
}

function text(events: ChatStreamEvent[]): string {
  return events.map((event) => (event.type === "delta" ? event.text : "")).join("");
}

describe("mockChatApi", () => {
  it("is labelled as the mock", () => {
    expect(mockChatApi.origin).toBe("mock");
  });

  it("yields the exact reply in deltas and then done", async () => {
    const events = await collect(fast.streamReply(request("Hi"), new AbortController().signal));
    expect(events.at(-1)).toEqual({ type: "done" });
    expect(text(events)).toBe(
      '**Demo reply.** No language model is connected yet, so this is a placeholder.\n\nYou wrote:\n> Hi\n\nCode blocks will look like this:\n\n```python\nprint("Hello from Perun LLM")\n```\n',
    );
  });

  it("yields chunks of 3 to 8 characters", async () => {
    const events = await collect(fast.streamReply(request("Hi"), new AbortController().signal));
    const deltas = events.flatMap((event) => (event.type === "delta" ? [event.text] : []));
    for (const delta of deltas.slice(0, -1)) {
      expect(delta.length).toBeGreaterThanOrEqual(3);
      expect(delta.length).toBeLessThanOrEqual(8);
    }
  });

  it("quotes only the first 300 characters of the last user message", async () => {
    const events = await collect(
      fast.streamReply(request("x".repeat(400)), new AbortController().signal),
    );
    expect(text(events)).toContain(`> ${"x".repeat(300)}\n`);
    expect(text(events)).not.toContain("x".repeat(301));
  });

  it("keeps every line of a multi-line message inside the quote", async () => {
    const events = await collect(
      fast.streamReply(request("one\n```\ntwo"), new AbortController().signal),
    );
    expect(text(events)).toContain("> one\n> ```\n> two\n");
  });

  it("waits before the first delta", async () => {
    const api = createMockChatApi({ initialDelayMs: 50, chunkDelayMs: 0 });
    const started = Date.now();
    const iterator = api.streamReply(request("Hi"), new AbortController().signal)[Symbol.asyncIterator]();
    await iterator.next();
    expect(Date.now() - started).toBeGreaterThanOrEqual(45);
  });

  it("ends immediately when aborted during the first wait", async () => {
    const api = createMockChatApi({ initialDelayMs: 60_000, chunkDelayMs: 0 });
    const controller = new AbortController();
    const pending = collect(api.streamReply(request("Hi"), controller.signal));
    controller.abort();
    expect(await pending).toEqual([]);
  });

  it("stops yielding after an abort mid-stream, without done", async () => {
    const controller = new AbortController();
    const events = await collect(fast.streamReply(request("Hi"), controller.signal), () =>
      controller.abort(),
    );
    expect(events).toHaveLength(1);
    expect(events[0]?.type).toBe("delta");
  });

  it("yields a retryable error for /error in test mode", async () => {
    const events = await collect(fast.streamReply(request("/error now"), new AbortController().signal));
    expect(events).toEqual([
      { type: "error", message: "The server could not be reached.", retryable: true },
    ]);
  });
});
