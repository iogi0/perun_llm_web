export const MAX_MESSAGE_LENGTH = 8000;
export const COUNTER_THRESHOLD = 7000;

interface EnterKeyEvent {
  key: string;
  shiftKey: boolean;
  isComposing: boolean;
  keyCode: number;
}

const IME_KEY_CODE = 229;

export function enterAction(
  event: EnterKeyEvent,
  coarsePointer: boolean,
): "send" | "newline" | "ignore" {
  if (event.key !== "Enter") return "ignore";
  if (event.isComposing || event.keyCode === IME_KEY_CODE) return "newline";
  if (event.shiftKey || coarsePointer) return "newline";
  return "send";
}

export function canSend(text: string, streaming: boolean): boolean {
  return (
    !streaming &&
    text.trim().length > 0 &&
    text.length <= MAX_MESSAGE_LENGTH
  );
}
