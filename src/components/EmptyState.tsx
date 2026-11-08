import { Logo } from "./Logo";

export function EmptyState() {
  return (
    <div className="grid min-h-0 flex-1 place-items-center overflow-y-auto p-6 text-center">
      <div className="max-w-[46rem]">
        <Logo size={56} className="mx-auto" />
        <h1 className="mt-4 text-[28px] leading-tight font-medium text-balance">
          How can I help you today?
        </h1>
        <p className="mt-2 text-ink-muted">
          Answers come from a demo responder until a model is connected.
        </p>
        <p className="mt-1 text-[13px] text-ink-muted">
          Chats are saved unencrypted in this browser. Anyone using this profile
          can read them.
        </p>
      </div>
    </div>
  );
}
