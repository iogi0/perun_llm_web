import type { ChatRequest, ChatStreamEvent } from "../types";
import type { ChatApi } from "./chatApi";

const MAX_QUOTE_LENGTH = 300;

function buildReply(userText: string): string {
  const quote = userText
    .slice(0, MAX_QUOTE_LENGTH)
    .split("\n")
    .map((line) => `> ${line}`)
    .join("\n");

  return [
    "**Demo reply.** No language model is connected yet, so this is a placeholder.",
    "",
    "You wrote:",
    quote,
    "",
    "Code blocks will look like this:",
    "",
    "```python",
    'print("Hello from Perun LLM")',
    "```",
    "",
  ].join("\n");
}

function wait(ms: number, signal: AbortSignal): Promise<void> {
  return new Promise((resolve) => {
    if (signal.aborted) {
      resolve();
      return;
    }
    const finish = () => {
      clearTimeout(timer);
      signal.removeEventListener("abort", finish);
      resolve();
    };
    const timer = setTimeout(finish, ms);
    signal.addEventListener("abort", finish);
  });
}

function chunkLength(): number {
  return 3 + Math.floor(Math.random() * 6);
}

const errorSimulationEnabled = import.meta.env.DEV || import.meta.env.MODE === "test";

interface MockOptions {
  initialDelayMs?: number;
  chunkDelayMs?: number;
}

export function createMockChatApi({
  initialDelayMs = 500,
  chunkDelayMs = 20,
}: MockOptions = {}): ChatApi {
  return {
    origin: "mock",
    async *streamReply(req: ChatRequest, signal: AbortSignal): AsyncGenerator<ChatStreamEvent> {
      const lastUser = req.messages.findLast((message) => message.role === "user");
      const userText = lastUser?.content ?? "";

      await wait(initialDelayMs, signal);
      if (signal.aborted) return;

      if (errorSimulationEnabled && userText.startsWith("/error")) {
        yield { type: "error", message: "The server could not be reached.", retryable: true };
        return;
      }

      const reply = buildReply(userText);
      let position = 0;
      while (position < reply.length) {
        const text = reply.slice(position, position + chunkLength());
        position += text.length;
        yield { type: "delta", text };
        if (signal.aborted) return;
        await wait(chunkDelayMs, signal);
        if (signal.aborted) return;
      }
      yield { type: "done" };
    },
  };
}

export const mockChatApi = createMockChatApi();
