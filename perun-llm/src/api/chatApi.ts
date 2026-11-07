import { config } from "../config";
import type { ChatRequest, ChatStreamEvent } from "../types";
import { mockChatApi } from "./mockChatApi";

export interface ChatApi {
  readonly origin: "mock" | "api";
  streamReply(req: ChatRequest, signal: AbortSignal): AsyncIterable<ChatStreamEvent>;
}

export function getChatApi(): ChatApi {
  if (config.apiMode === "mock") return mockChatApi;
  throw new Error(
    'VITE_API_MODE is "http", but the HTTP client is not built yet. Set it to "mock".',
  );
}
