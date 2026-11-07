import { describe, expect, it } from "vitest";
import { canSend, enterAction, MAX_MESSAGE_LENGTH } from "./composerKeys";

const enter = { key: "Enter", shiftKey: false, isComposing: false, keyCode: 13 };

describe("enterAction", () => {
  it("sends on Enter", () => {
    expect(enterAction(enter, false)).toBe("send");
  });

  it("adds a new line on Shift+Enter", () => {
    expect(enterAction({ ...enter, shiftKey: true }, false)).toBe("newline");
  });

  it("does not send during IME composition", () => {
    expect(enterAction({ ...enter, isComposing: true }, false)).toBe("newline");
  });

  it("does not send on the IME keyCode some browsers report instead", () => {
    expect(enterAction({ ...enter, keyCode: 229 }, false)).toBe("newline");
  });

  it("adds a new line on Enter with a coarse pointer", () => {
    expect(enterAction(enter, true)).toBe("newline");
  });

  it("ignores other keys", () => {
    expect(enterAction({ ...enter, key: "a" }, false)).toBe("ignore");
  });
});

describe("canSend", () => {
  it("blocks empty and whitespace-only text", () => {
    expect(canSend("", false)).toBe(false);
    expect(canSend("  \n ", false)).toBe(false);
  });

  it("allows text while no reply is streaming", () => {
    expect(canSend("hello", false)).toBe(true);
  });

  it("blocks text while a reply is streaming", () => {
    expect(canSend("hello", true)).toBe(false);
  });

  it("allows the limit and blocks one character over it", () => {
    expect(canSend("a".repeat(MAX_MESSAGE_LENGTH), false)).toBe(true);
    expect(canSend("a".repeat(MAX_MESSAGE_LENGTH + 1), false)).toBe(false);
  });
});
