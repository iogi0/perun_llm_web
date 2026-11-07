import { ChatView } from "./components/ChatView";
import { Composer } from "./components/Composer";
import { EmptyState } from "./components/EmptyState";
import { Sidebar } from "./components/Sidebar";
import type { Conversation } from "./types";

const sampleTime = "2026-11-07T12:00:00.000Z";
const sample: Conversation[] = [
  "Reading a CSV file in Python",
  "Thesis outline for chapter two",
  "Explain vLLM batching",
].map((title) => ({
  id: title,
  title,
  createdAt: sampleTime,
  updatedAt: sampleTime,
  messages: [],
}));

const noop = () => undefined;

export function App() {
  return (
    <div className="grid h-dvh grid-cols-1 lg:grid-cols-[264px_minmax(0,1fr)]">
      <aside className="hidden min-h-0 border-r border-line lg:block">
        <Sidebar
          conversations={sample}
          activeId={sample[0]?.id ?? null}
          onNew={noop}
          onOpen={noop}
          onDelete={noop}
        />
      </aside>
      <ChatView
        title="New chat"
        onOpenMenu={noop}
        showDemoNotice={false}
        composer={<Composer streaming={false} onSend={noop} onStop={noop} />}
      >
        <EmptyState />
      </ChatView>
    </div>
  );
}
