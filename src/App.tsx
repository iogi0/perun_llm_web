import { useCallback, useState } from "react";
import { useChat } from "./chat/ChatContext";
import { DEFAULT_TITLE } from "./chat/chatReducer";
import { ChatView } from "./components/ChatView";
import { Composer } from "./components/Composer";
import { EmptyState } from "./components/EmptyState";
import { MessageList } from "./components/MessageList";
import { MobileDrawer } from "./components/MobileDrawer";
import { Sidebar } from "./components/Sidebar";

export function App() {
  const { state, historySaveFailed, send, stop, retry } = useChat();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const closeDrawer = useCallback(() => setDrawerOpen(false), []);
  const active = state.conversations.find((c) => c.id === state.activeId);
  const hasMessages = (active?.messages.length ?? 0) > 0;

  return (
    <div className="grid h-dvh grid-cols-1 lg:grid-cols-[264px_minmax(0,1fr)]">
      <aside className="hidden min-h-0 border-r border-line lg:block">
        <Sidebar />
      </aside>
      <ChatView
        title={active?.title ?? DEFAULT_TITLE}
        onOpenMenu={() => setDrawerOpen(true)}
        showDemoNotice={hasMessages}
        historySaveFailed={historySaveFailed}
        composer={<Composer streaming={state.streaming !== null} onSend={send} onStop={stop} />}
      >
        {active && hasMessages ? (
          <MessageList key={active.id} messages={active.messages} onRetry={retry} />
        ) : (
          <EmptyState />
        )}
      </ChatView>
      <MobileDrawer open={drawerOpen} onClose={closeDrawer} />
    </div>
  );
}
