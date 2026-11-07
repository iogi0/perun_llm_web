import { useChat } from "./chat/ChatContext";
import { DEFAULT_TITLE } from "./chat/chatReducer";
import { ChatView } from "./components/ChatView";
import { Composer } from "./components/Composer";
import { EmptyState } from "./components/EmptyState";
import { MessageList } from "./components/MessageList";
import { Sidebar } from "./components/Sidebar";

const noop = () => undefined;

export function App() {
  const { state, newChat, openChat, deleteChat, send, stop, retry } = useChat();
  const active = state.conversations.find((c) => c.id === state.activeId);
  const hasMessages = (active?.messages.length ?? 0) > 0;

  return (
    <div className="grid h-dvh grid-cols-1 lg:grid-cols-[264px_minmax(0,1fr)]">
      <aside className="hidden min-h-0 border-r border-line lg:block">
        <Sidebar
          conversations={state.conversations}
          activeId={state.activeId}
          onNew={newChat}
          onOpen={openChat}
          onDelete={deleteChat}
        />
      </aside>
      <ChatView
        title={active?.title ?? DEFAULT_TITLE}
        onOpenMenu={noop}
        showDemoNotice={hasMessages}
        composer={<Composer streaming={state.streaming !== null} onSend={send} onStop={stop} />}
      >
        {active && hasMessages ? (
          <MessageList key={active.id} messages={active.messages} onRetry={retry} />
        ) : (
          <EmptyState />
        )}
      </ChatView>
    </div>
  );
}
