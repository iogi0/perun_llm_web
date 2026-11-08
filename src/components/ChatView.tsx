import { Menu } from "lucide-react";
import type { ReactNode } from "react";

interface ChatViewProps {
  title: string;
  onOpenMenu: () => void;
  composer: ReactNode;
  showDemoNotice: boolean;
  historySaveFailed: boolean;
  children: ReactNode;
}

export function ChatView({
  title,
  onOpenMenu,
  composer,
  showDemoNotice,
  historySaveFailed,
  children,
}: ChatViewProps) {
  return (
    <main className="flex h-full min-h-0 min-w-0 flex-col bg-canvas">
      <header className="flex h-14 shrink-0 items-center gap-1 border-b border-line px-2 md:px-4 lg:hidden">
        <button
          type="button"
          aria-label="Open menu"
          onClick={onOpenMenu}
          className="grid size-11 shrink-0 cursor-pointer place-items-center rounded-[10px] hover:bg-bubble"
        >
          <Menu size={20} aria-hidden="true" />
        </button>
        <p className="min-w-0 truncate font-medium">{title}</p>
      </header>
      {children}
      <div className="shrink-0 px-4 pt-2 pb-[max(0.75rem,env(safe-area-inset-bottom))] md:px-6">
        <div className="mx-auto w-full max-w-[46rem]">
          {historySaveFailed && (
            <p role="status" className="mb-2 text-center text-[13px] text-danger">
              History can&apos;t be saved in this browser.
            </p>
          )}
          {composer}
          {showDemoNotice && (
            <p className="mt-2 text-center text-[13px] text-ink-muted">
              Answers come from a demo responder until a model is connected.
            </p>
          )}
        </div>
      </div>
    </main>
  );
}
