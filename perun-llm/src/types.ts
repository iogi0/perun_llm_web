export type Role = "user" | "assistant";
export type MessageStatus = "complete" | "streaming" | "stopped" | "error";

export interface Message {
  id: string;
  role: Role;
  content: string;
  createdAt: string;
  status: MessageStatus;
  origin?: "mock" | "api";
  error?: string;
}

export interface Conversation {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  messages: Message[];
}

export interface ChatRequest {
  conversationId: string;
  messages: { role: Role; content: string }[];
}

export type ChatStreamEvent =
  | { type: "delta"; text: string }
  | { type: "done" }
  | { type: "error"; message: string; retryable: boolean };
