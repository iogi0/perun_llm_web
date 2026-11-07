import { describe, expect, it } from "vitest";
import { copyText } from "./copyText";

describe("copyText", () => {
  it("copies with the clipboard API in a secure context", async () => {
    let copied = "";
    const clipboard = { writeText: async (text: string) => { copied = text; } };
    expect(await copyText("print(1)", clipboard)).toBe(true);
    expect(copied).toBe("print(1)");
  });

  it("reports failure when the clipboard API is missing, as on plain-http LAN addresses", async () => {
    expect(await copyText("print(1)", undefined)).toBe(false);
  });

  it("reports failure when the clipboard API rejects", async () => {
    const clipboard = { writeText: () => Promise.reject(new Error("denied")) };
    expect(await copyText("print(1)", clipboard)).toBe(false);
  });
});
